// ============================================================================
// LÓGICA DE NEGÓCIO — Histórico de ações do sistema (auditoria + reversão)
// ----------------------------------------------------------------------------
// Toda rota de API que cria, edita ou apaga um Contrato, Parcela, Cliente ou
// Lançamento deve chamar registrarAcao() logo depois da operação no banco,
// passando o estado "antes" e "depois" do registro.
//
// Isso alimenta duas coisas:
//   1) A timeline de Histórico (financeiro e contratos), que só faz um
//      findMany ordenado por criadoEm desc.
//   2) O botão "Reverter", que usa reverterAcao() para restaurar o snapshot
//      "antes" (ou apagar o registro, se a ação original foi uma criação).
//
// Por que não usar um "trigger" no banco? Porque precisamos do contexto de
// QUEM fez a ação (usuarioId da sessão) e de um texto amigável em português
// para mostrar na tela — informação que só a camada de API tem.
// ============================================================================
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export type EntidadeHistorico = "Contrato" | "Parcela" | "Cliente" | "Lancamento";

// Cliente Prisma OU o objeto de transação (`tx`) passado por prisma.$transaction —
// aceitamos os dois para permitir registrar a ação atomicamente junto da
// operação principal, quando isso for importante (ex: pagar uma parcela).
type PrismaOuTx = PrismaClient | Prisma.TransactionClient;

interface RegistrarAcaoParams {
  usuarioId: string;
  tipo: string; // ex: "CONTRATO_CRIADO", "LANCAMENTO_EDITADO", "PARCELA_PAGA"
  entidade: EntidadeHistorico;
  entidadeId: string;
  descricao: string;
  valor?: number | null; // positivo = entrada, negativo = saída, omitir se não fizer sentido
  dadosAntes?: unknown; // snapshot antes da ação (omitir/null se foi uma criação)
  dadosDepois?: unknown; // snapshot depois da ação (omitir/null se foi uma exclusão)
}

// ----------------------------------------------------------------------------
// Grava uma linha no histórico. Serializa os snapshots via JSON.stringify/parse
// para converter tipos do Prisma (Decimal, Date) em algo que o campo Json aceita.
// ----------------------------------------------------------------------------
export async function registrarAcao(db: PrismaOuTx, params: RegistrarAcaoParams) {
  const serializar = (v: unknown) => (v == null ? null : JSON.parse(JSON.stringify(v)));

  return db.historicoAcao.create({
    data: {
      usuarioId: params.usuarioId,
      tipo: params.tipo,
      entidade: params.entidade,
      entidadeId: params.entidadeId,
      descricao: params.descricao,
      valor: params.valor ?? null,
      dadosAntes: serializar(params.dadosAntes),
      dadosDepois: serializar(params.dadosDepois),
    },
  });
}

// ----------------------------------------------------------------------------
// Reverte uma ação do histórico:
//   - Se ela tinha "dadosAntes" -> restaura o registro para esse estado (update)
//   - Se ela era uma criação (dadosAntes = null) -> apaga o registro criado
//   - Se ela era uma exclusão (dadosDepois = null) -> recria o registro com
//     os dados de "dadosAntes" (útil para restaurar algo excluído por engano)
//
// Sempre marca a linha original como revertida e cria uma NOVA linha de
// histórico do tipo "REVERSAO" — nunca apaga o histórico em si.
// ----------------------------------------------------------------------------
export async function reverterAcao(usuarioId: string, historicoId: string) {
  const acao = await prisma.historicoAcao.findFirst({
    where: { id: historicoId, usuarioId },
  });

  if (!acao) {
    return { ok: false as const, erro: "Ação não encontrada." };
  }
  if (acao.revertidoEm) {
    return { ok: false as const, erro: "Esta ação já foi revertida." };
  }

  return prisma.$transaction(async (tx) => {
    const antes = acao.dadosAntes as Record<string, unknown> | null;
    const depois = acao.dadosDepois as Record<string, unknown> | null;

    await aplicarReversao(tx, acao.entidade, acao.entidadeId, antes, depois);

    await tx.historicoAcao.update({
      where: { id: acao.id },
      data: { revertidoEm: new Date(), revertidoPor: usuarioId },
    });

    const nova = await registrarAcao(tx, {
      usuarioId,
      tipo: "REVERSAO",
      entidade: acao.entidade,
      entidadeId: acao.entidadeId,
      descricao: `Reversão: ${acao.descricao}`,
      valor: acao.valor ? Number(acao.valor) * -1 : null,
      dadosAntes: depois,
      dadosDepois: antes,
    });
    await tx.historicoAcao.update({ where: { id: nova.id }, data: { origemId: acao.id } });

    return { ok: true as const };
  });
}

// ----------------------------------------------------------------------------
// Aplica a reversão propriamente dita no model correto. Campos de data/valor
// precisam ser reconvertidos porque o snapshot em Json vira string/number puro.
// ----------------------------------------------------------------------------
async function aplicarReversao(
  tx: Prisma.TransactionClient,
  entidade: EntidadeHistorico,
  entidadeId: string,
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null
) {
  const model = {
    Contrato: tx.contrato,
    Parcela: tx.parcela,
    Cliente: tx.cliente,
    Lancamento: tx.lancamento,
  }[entidade] as any;

  if (antes == null) {
    // A ação original era uma criação -> reverter = apagar.
    // Se o registro já não existir (ex: excluído depois por outra ação),
    // simplesmente ignora — o resultado final é o mesmo.
    await model.deleteMany({ where: { id: entidadeId } });
    return;
  }

  const dadosLimpos = limparCamposImutaveis(entidade, antes);

  if (depois == null) {
    // A ação original era uma exclusão -> reverter = recriar com o snapshot.
    // upsert evita erro de "id já existe" se, por algum motivo, o registro
    // ainda estiver lá.
    await model.upsert({
      where: { id: entidadeId },
      create: { id: entidadeId, ...dadosLimpos },
      update: dadosLimpos,
    });
    return;
  }

  // Caso normal: era uma edição -> reverter = voltar para o estado "antes".
  await model.update({ where: { id: entidadeId }, data: dadosLimpos });
}

// ----------------------------------------------------------------------------
// Remove do snapshot os campos que não podem/devem ser reescritos num update
// (relações, ids de relação e o próprio id) e reconverte datas ISO-string
// para Date, já que o snapshot passou por JSON.
// ----------------------------------------------------------------------------
const CAMPOS_DATA_POR_ENTIDADE: Record<EntidadeHistorico, string[]> = {
  Contrato: ["dataPrimeiraParcela", "criadoEm"],
  Parcela: ["vencimento", "pagoEm"],
  Cliente: ["dataNascimento", "criadoEm"],
  Lancamento: ["dataVencimento", "dataPagamento", "criadoEm"],
};

const CAMPOS_IGNORADOS_POR_ENTIDADE: Record<EntidadeHistorico, string[]> = {
  Contrato: ["id", "cliente", "parcelas", "usuario"],
  Parcela: ["id", "contrato"],
  Cliente: ["id", "contratos", "usuario"],
  Lancamento: ["id", "categoria", "conta", "recorrente", "usuario"],
};

function limparCamposImutaveis(entidade: EntidadeHistorico, snapshot: Record<string, unknown>) {
  const ignorados = new Set(CAMPOS_IGNORADOS_POR_ENTIDADE[entidade]);
  const camposData = new Set(CAMPOS_DATA_POR_ENTIDADE[entidade]);

  const resultado: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(snapshot)) {
    if (ignorados.has(chave)) continue;
    resultado[chave] = camposData.has(chave) && valor ? new Date(valor as string) : valor;
  }
  return resultado;
}

// ----------------------------------------------------------------------------
// Helper para formatar o texto amigável de um lançamento/parcela nas ações
// mais comuns, reaproveitado pelas rotas de API para não repetir a lógica.
// ----------------------------------------------------------------------------
export function descricaoValor(valor: number | string, positivo: boolean): number {
  const n = typeof valor === "number" ? valor : parseFloat(valor);
  return positivo ? n : n * -1;
}
