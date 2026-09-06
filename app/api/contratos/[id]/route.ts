// ============================================================================
// API: /api/contratos/[id]
// GET    -> detalhe do contrato, com cliente e parcelas
// DELETE -> exclui o contrato (e parcelas, via cascade)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const contrato = await prisma.contrato.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { cliente: true, parcelas: { orderBy: { numero: "asc" } } },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  return NextResponse.json(contrato);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.contrato.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  await prisma.contrato.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
