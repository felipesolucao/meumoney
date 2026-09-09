// ============================================================================
// API: /api/lancamentos/[id]
// GET    -> detalhe do lançamento
// PATCH  -> marcar como pago/pendente, ou editar campos (não mexe na recorrência)
// DELETE -> exclui apenas esta ocorrência. Se ?serie=true, exclui a regra de
//           recorrência inteira (todas as ocorrências futuras e passadas).
// ----------------------------------------------------------------------------
// Todas as ações exigem que o lançamento pertença ao usuário logado.
// Toda alteração/exclusão grava um snapshot "antes" em HistoricoAcao, o que
// permite desfazer (reverter) a ação depois pela tela de Histórico.
//
// NOVO: se este Lancamento é o Lancamento consolidado de uma fatura de
// cartão (FaturaCartao.lancamentoId aponta pra ele), marcar como pago/reabrir
// aqui também sincroniza FaturaCartao.status (fechada <-> paga) — é assim que
// a tela de extrato do cartão sabe mostrar "Paga" sem lógica própria.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { registrarAcao } from "../../../../lib/historico";

// Sincroniza o status da fatura, se este Lancamento for o de uma fatura.
// Silenciosa (não faz nada) se não houver fatura vinculada — a maioria dos
// Lancamentos do app não tem.
async function sincronizarFaturaDoLancamento(lancamentoId: string, novoStatus: "pago" | "pendente") {
  const fatura = await prisma.faturaCartao.findUnique({ where: { lancamentoId } });
  if (!fatura) return;
  await prisma.faturaCartao.update({
    where: { id: fatura.id },
    data: { status: novoStatus === "pago" ? "paga" : "fechada" },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lancamento = await prisma.lancamento.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { categoria: true, conta: true, recorrente: true },
  });
  if (!lancamento) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }
  return NextResponse.json(lancamento);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.lancamento.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

  const body = await req.json();
  const { acao, dataRecebimento, valorRecebido, ...campos } = body as {
    acao?: "pagar" | "reabrir";
    dataRecebimento?: string;
    valorRecebido?: number;
    descricao?: string;
    valor?: number;
    dataVencimento?: string;
    categoriaId?: string;
    contaId?: string;
    observacoes?: string;
  };

  const sinal = existente.tipo === "receita" ? 1 : -1;

  // --- Ações rápidas usadas pelos botões da lista --------------------------
  // "pagar" aceita dataRecebimento/valorRecebido (ver ReceberLancamentoModal)
  // — sem valorRecebido, assume que recebeu o que falta (comportamento de
  // sempre). Se o total recebido ficar abaixo do valor do lançamento, vira
  // "pagamento parcial": continua pendente, só acumula o valor recebido —
  // mesma lógica de app/api/parcelas/[id]/route.ts.
  if (acao === "pagar") {
    const valorTotal = Number(existente.valor);
    const jaRecebido = Number(existente.valorPago ?? 0);
    const recebidoAgora = valorRecebido !== undefined ? Number(valorRecebido) : valorTotal - jaRecebido;
    const novoValorPago = jaRecebido + recebidoAgora;
    const dataPagamento = dataRecebimento ? new Date(dataRecebimento) : new Date();
    const quitado = novoValorPago >= valorTotal;

    const lancamento = await prisma.lancamento.update({
      where: { id: params.id },
      data: quitado
        ? { status: "pago", dataPagamento, valorPago: novoValorPago }
        : { valorPago: novoValorPago },
    });
    if (quitado) await sincronizarFaturaDoLancamento(lancamento.id, "pago");
    await registrarAcao(prisma, {
      usuarioId: sessao.id,
      tipo: quitado ? "LANCAMENTO_PAGO" : "LANCAMENTO_PAGAMENTO_PARCIAL",
      entidade: "Lancamento",
      entidadeId: lancamento.id,
      descricao: `${quitado ? (existente.tipo === "receita" ? "Recebido" : "Pago") : "Pagamento parcial"}: ${existente.descricao}`,
      valor: recebidoAgora * sinal,
      dadosAntes: existente,
      dadosDepois: lancamento,
    });
    return NextResponse.json(lancamento);
  }

  if (acao === "reabrir") {
    const lancamento = await prisma.lancamento.update({
      where: { id: params.id },
      data: { status: "pendente", dataPagamento: null, valorPago: null },
    });
    await sincronizarFaturaDoLancamento(lancamento.id, "pendente");
    await registrarAcao(prisma, {
      usuarioId: sessao.id,
      tipo: "LANCAMENTO_REABERTO",
      entidade: "Lancamento",
      entidadeId: lancamento.id,
      descricao: `Reaberto: ${existente.descricao}`,
      valor: Number(existente.valorPago ?? existente.valor) * sinal * -1,
      dadosAntes: existente,
      dadosDepois: lancamento,
    });
    return NextResponse.json(lancamento);
  }

  // --- Edição geral dos campos ----------------------------------------------
  const lancamento = await prisma.lancamento.update({
    where: { id: params.id },
    data: {
      ...(campos.descricao !== undefined ? { descricao: campos.descricao } : {}),
      ...(campos.valor !== undefined ? { valor: Number(campos.valor) } : {}),
      ...(campos.dataVencimento !== undefined ? { dataVencimento: new Date(campos.dataVencimento) } : {}),
      ...(campos.categoriaId !== undefined ? { categoriaId: campos.categoriaId || null } : {}),
      ...(campos.contaId !== undefined ? { contaId: campos.contaId || null } : {}),
      ...(campos.observacoes !== undefined ? { observacoes: campos.observacoes || null } : {}),
    },
  });

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "LANCAMENTO_EDITADO",
    entidade: "Lancamento",
    entidadeId: lancamento.id,
    descricao: `Lançamento editado: ${lancamento.descricao}`,
    valor: Number(lancamento.valor) * sinal,
    dadosAntes: existente,
    dadosDepois: lancamento,
  });

  return NextResponse.json(lancamento);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lancamento = await prisma.lancamento.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!lancamento) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

  const excluirSerie = req.nextUrl.searchParams.get("serie") === "true";
  const sinal = lancamento.tipo === "receita" ? 1 : -1;

  if (excluirSerie && lancamento.recorrenteId) {
    // Excluir a regra apaga em cascata todas as ocorrências dela (ver schema).
    // Confere de novo que a regra também é do usuário logado antes de apagar.
    const regra = await prisma.lancamentoRecorrente.findFirst({
      where: { id: lancamento.recorrenteId, usuarioId: sessao.id },
    });
    if (regra) {
      await prisma.lancamentoRecorrente.delete({ where: { id: regra.id } });
      await registrarAcao(prisma, {
        usuarioId: sessao.id,
        tipo: "LANCAMENTO_SERIE_EXCLUIDA",
        entidade: "Lancamento",
        entidadeId: lancamento.id,
        descricao: `Série excluída: ${lancamento.descricao}`,
        valor: Number(lancamento.valor) * sinal,
        dadosAntes: { regra, lancamento },
        // Nota: por envolver múltiplos registros em cascata, a reversão de uma
        // série inteira não é suportada automaticamente — ver lib/historico.ts.
      });
      return NextResponse.json({ ok: true });
    }
  }

  await prisma.lancamento.delete({ where: { id: params.id } });

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "LANCAMENTO_EXCLUIDO",
    entidade: "Lancamento",
    entidadeId: lancamento.id,
    descricao: `Lançamento excluído: ${lancamento.descricao}`,
    valor: Number(lancamento.valor) * sinal,
    dadosAntes: lancamento,
  });

  return NextResponse.json({ ok: true });
}
