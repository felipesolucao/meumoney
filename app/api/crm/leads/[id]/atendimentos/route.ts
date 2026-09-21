// ============================================================================
// API: /api/crm/leads/[id]/atendimentos
// GET  -> histórico de atendimentos do lead (mais recente primeiro) — nunca
//         inclui o conteúdo do anexo, só nome/tipo/tamanho (ver "arquivo" em
//         .../atendimentos/[atendimentoId]/arquivo pro download)
// POST -> registra um novo atendimento/observação, com anexo opcional
//         (multipart/form-data), e atualiza "dataUltimoContato" do lead
//         quando esta é a tratativa mais recente
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { obterSessao } from "../../../../../../lib/auth";

const TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024; // 5MB — sem serviço de storage externo, o anexo vai pro banco.

const SELECAO_SEM_ARQUIVO = {
  id: true,
  leadId: true,
  observacao: true,
  tentativaNumero: true,
  dataTratativa: true,
  alertaEm: true,
  alertaConcluidoEm: true,
  arquivoNome: true,
  arquivoTipo: true,
  arquivoTamanho: true,
  criadoEm: true,
  atualizadoEm: true,
} as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lead = await prisma.leadCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const atendimentos = await prisma.atendimentoCrm.findMany({
    where: { leadId: params.id },
    orderBy: { dataTratativa: "desc" },
    select: SELECAO_SEM_ARQUIVO,
  });
  return NextResponse.json(atendimentos);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lead = await prisma.leadCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const formData = await req.formData();
  const observacao = formData.get("observacao");
  const tentativaNumero = formData.get("tentativaNumero");
  const dataTratativa = formData.get("dataTratativa");
  const alertaEm = formData.get("alertaEm");
  const arquivo = formData.get("arquivo");

  if (!observacao || !String(observacao).trim()) {
    return NextResponse.json({ error: "Descreva o atendimento." }, { status: 400 });
  }

  const dataFinal = dataTratativa ? new Date(String(dataTratativa)) : new Date();
  if (Number.isNaN(dataFinal.getTime())) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }

  const dataAlerta = alertaEm ? new Date(String(alertaEm)) : null;
  if (dataAlerta && Number.isNaN(dataAlerta.getTime())) {
    return NextResponse.json({ error: "Data do alerta inválida." }, { status: 400 });
  }

  let dadosAnexo: { arquivoNome: string; arquivoTipo: string; arquivoTamanho: number; arquivoDados: Buffer } | null = null;
  // Não use `instanceof File` aqui: em runtimes Node nos quais `File` não é
  // exposto globalmente essa expressão lança um ReferenceError, inclusive
  // quando nenhum anexo foi enviado. O FormData já garante que uma entrada
  // que não é string possui a interface de arquivo necessária.
  if (arquivo !== null && typeof arquivo !== "string" && arquivo.size > 0) {
    if (arquivo.size > TAMANHO_MAXIMO_ANEXO) {
      return NextResponse.json({ error: "Anexo maior que 5MB." }, { status: 400 });
    }
    dadosAnexo = {
      arquivoNome: arquivo.name,
      arquivoTipo: arquivo.type || "application/octet-stream",
      arquivoTamanho: arquivo.size,
      arquivoDados: Buffer.from(await arquivo.arrayBuffer()),
    };
  }

  const atendimento = await prisma.atendimentoCrm.create({
    data: {
      observacao: String(observacao).trim(),
      tentativaNumero: tentativaNumero !== null && tentativaNumero !== "" ? Number(tentativaNumero) : null,
      dataTratativa: dataFinal,
      alertaEm: dataAlerta,
      leadId: params.id,
      usuarioId: sessao.id,
      ...dadosAnexo,
    },
    select: SELECAO_SEM_ARQUIVO,
  });

  // Mantém "dataUltimoContato" do lead sempre igual à tratativa mais recente
  // registrada — é o que aparece no card e alimenta filtros/automação futura.
  if (!lead.dataUltimoContato || dataFinal > lead.dataUltimoContato) {
    await prisma.leadCrm.update({ where: { id: lead.id }, data: { dataUltimoContato: dataFinal } });
  }

  return NextResponse.json(atendimento, { status: 201 });
}
