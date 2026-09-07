import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const carteiras = await prisma.carteira.findMany({
    where: { usuarioId: sessao.id },
    orderBy: { criadoEm: "asc" },
  });
  return NextResponse.json(carteiras);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { nome } = (await req.json()) as { nome?: string };
  if (!nome?.trim()) return NextResponse.json({ error: "Informe o nome da carteira." }, { status: 400 });

  try {
    const carteira = await prisma.carteira.create({ data: { nome: nome.trim(), usuarioId: sessao.id } });
    return NextResponse.json(carteira, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Já existe uma carteira com esse nome." }, { status: 409 });
  }
}
