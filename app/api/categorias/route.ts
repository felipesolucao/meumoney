// ============================================================================
// API: /api/categorias
// GET  -> lista categorias DO USUÁRIO LOGADO (opcionalmente por ?tipo=)
// POST -> cria uma nova categoria, vinculada ao usuário logado
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const tipo = req.nextUrl.searchParams.get("tipo");
  const categorias = await prisma.categoria.findMany({
    where: { usuarioId: sessao.id, ...(tipo ? { tipo: tipo as "receita" | "despesa" } : {}) },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(categorias);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { nome, tipo, icone, cor } = body as { nome: string; tipo: "receita" | "despesa"; icone?: string; cor?: string };

  if (!nome || !tipo) {
    return NextResponse.json({ error: "Informe nome e tipo da categoria." }, { status: 400 });
  }

  const categoria = await prisma.categoria.create({
    data: { nome, tipo, icone: icone || undefined, cor: cor || undefined, usuarioId: sessao.id },
  });
  return NextResponse.json(categoria, { status: 201 });
}
