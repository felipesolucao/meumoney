// ============================================================================
// API: /api/clientes
// GET  -> lista os clientes DO USUÁRIO LOGADO, com contagem de contratos
// POST -> cria um novo cliente, já vinculado ao usuário logado
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const clientes = await prisma.cliente.findMany({
    where: { usuarioId: sessao.id },
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { contratos: true } } },
  });
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { nome, telefone, cpf, score } = body;

  if (!nome || !nome.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const cliente = await prisma.cliente.create({
    data: {
      nome: nome.trim(),
      telefone: telefone?.trim() || null,
      cpf: cpf?.trim() || null,
      score: score || "medio",
      usuarioId: sessao.id,
    },
  });

  return NextResponse.json(cliente, { status: 201 });
}
