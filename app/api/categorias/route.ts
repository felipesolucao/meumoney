// ============================================================================
// API: /api/categorias
// GET  -> lista categorias (opcionalmente filtradas por ?tipo=receita|despesa)
// POST -> cria uma nova categoria
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo");
  const categorias = await prisma.categoria.findMany({
    where: tipo ? { tipo: tipo as "receita" | "despesa" } : undefined,
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(categorias);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, tipo, icone, cor } = body as { nome: string; tipo: "receita" | "despesa"; icone?: string; cor?: string };

  if (!nome || !tipo) {
    return NextResponse.json({ error: "Informe nome e tipo da categoria." }, { status: 400 });
  }

  const categoria = await prisma.categoria.create({
    data: { nome, tipo, icone: icone || undefined, cor: cor || undefined },
  });
  return NextResponse.json(categoria, { status: 201 });
}
