// ============================================================================
// API: /api/crm/automacoes/[id]
// PATCH  -> edita uma regra (nome, condições, destino, ativo/ordem)
// DELETE -> remove uma regra
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { ESTAGIOS_IDS } from "../../../../../lib/crm";

function numeroOuNull(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.automacaoCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Regra não encontrada." }, { status: 404 });

  const body = await req.json();
  const dados: Record<string, unknown> = {};

  if (body.nome !== undefined) {
    if (!String(body.nome).trim()) return NextResponse.json({ error: "Dê um nome para a regra." }, { status: 400 });
    dados.nome = String(body.nome).trim();
  }
  if (body.estagioDestino !== undefined) {
    if (!ESTAGIOS_IDS.includes(body.estagioDestino)) return NextResponse.json({ error: "Etapa de destino inválida." }, { status: 400 });
    dados.estagioDestino = body.estagioDestino;
  }
  if (body.statusPlanilha !== undefined) dados.statusPlanilha = body.statusPlanilha?.trim() || null;
  if (body.progressoMin !== undefined) dados.progressoMin = numeroOuNull(body.progressoMin);
  if (body.progressoMax !== undefined) dados.progressoMax = numeroOuNull(body.progressoMax);
  if (body.ativo !== undefined) dados.ativo = !!body.ativo;
  if (body.ordem !== undefined) dados.ordem = Number(body.ordem) || 0;

  const regra = await prisma.automacaoCrm.update({ where: { id: params.id }, data: dados });
  return NextResponse.json(regra);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.automacaoCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Regra não encontrada." }, { status: 404 });

  await prisma.automacaoCrm.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
