// ============================================================================
// API: /api/crm/leads/[id]/atendimentos/[atendimentoId]
// PATCH  -> edita um atendimento já registrado
// DELETE -> remove um atendimento
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { obterSessao } from "../../../../../../../lib/auth";

// Nunca inclui "arquivoDados" (Bytes) — vira um objeto {type:"Buffer",...}
// gigante no JSON de resposta e vaza o conteúdo do anexo numa edição de
// texto. Baixar o anexo tem rota própria (ver .../arquivo/route.ts).
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

async function buscarAtendimento(leadId: string, atendimentoId: string, usuarioId: string) {
  return prisma.atendimentoCrm.findFirst({
    where: { id: atendimentoId, leadId, usuarioId, lead: { usuarioId } },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; atendimentoId: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await buscarAtendimento(params.id, params.atendimentoId, sessao.id);
  if (!existente) return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });

  const body = await req.json();
  const dados: Record<string, unknown> = {};

  if (body.observacao !== undefined) {
    if (!String(body.observacao).trim()) return NextResponse.json({ error: "Descreva o atendimento." }, { status: 400 });
    dados.observacao = String(body.observacao).trim();
  }
  if (body.tentativaNumero !== undefined) {
    dados.tentativaNumero = body.tentativaNumero === null || body.tentativaNumero === "" ? null : Number(body.tentativaNumero);
  }
  if (body.dataTratativa !== undefined) {
    const d = new Date(body.dataTratativa);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Data inválida." }, { status: 400 });
    dados.dataTratativa = d;
  }

  const atendimento = await prisma.atendimentoCrm.update({
    where: { id: params.atendimentoId },
    data: dados,
    select: SELECAO_SEM_ARQUIVO,
  });
  return NextResponse.json(atendimento);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; atendimentoId: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await buscarAtendimento(params.id, params.atendimentoId, sessao.id);
  if (!existente) return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });

  await prisma.atendimentoCrm.delete({ where: { id: params.atendimentoId } });
  return NextResponse.json({ ok: true });
}
