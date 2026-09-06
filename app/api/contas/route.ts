// ============================================================================
// API: /api/contas
// GET  -> lista as contas/carteiras cadastradas (ex: Nubank, Infinitypay)
// POST -> cria uma nova conta/carteira
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const contas = await prisma.conta.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(contas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, icone } = body as { nome: string; icone?: string };

  if (!nome) {
    return NextResponse.json({ error: "Informe o nome da conta." }, { status: 400 });
  }

  const conta = await prisma.conta.create({ data: { nome, icone: icone || undefined } });
  return NextResponse.json(conta, { status: 201 });
}
