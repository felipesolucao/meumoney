import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { nome } = (await req.json()) as { nome?: string };
  if (!nome?.trim()) return NextResponse.json({ error: "Informe o nome da carteira." }, { status: 400 });

  const carteira = await prisma.carteira.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!carteira) return NextResponse.json({ error: "Carteira não encontrada." }, { status: 404 });
  try {
    return NextResponse.json(await prisma.carteira.update({ where: { id: carteira.id }, data: { nome: nome.trim() } }));
  } catch {
    return NextResponse.json({ error: "Já existe uma carteira com esse nome." }, { status: 409 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const carteira = await prisma.carteira.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!carteira) return NextResponse.json({ error: "Carteira não encontrada." }, { status: 404 });

  // As contas não são excluídas: voltam a compor a visão Geral.
  await prisma.carteira.delete({ where: { id: carteira.id } });
  return NextResponse.json({ ok: true });
}
