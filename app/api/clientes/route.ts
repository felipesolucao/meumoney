// ============================================================================
// API: /api/clientes
// GET  -> lista todos os clientes com contagem de contratos
// POST -> cria um novo cliente
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { contratos: true } } },
  });
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
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
    },
  });

  return NextResponse.json(cliente, { status: 201 });
}
