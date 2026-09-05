// ============================================================================
// API: /api/clientes/[id]
// GET    -> detalhe do cliente com todos os contratos e parcelas
// PATCH  -> atualiza dados cadastrais do cliente
// DELETE -> remove o cliente (e seus contratos/parcelas, via cascade)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: params.id },
    include: {
      contratos: {
        orderBy: { criadoEm: "desc" },
        include: { parcelas: { orderBy: { numero: "asc" } } },
      },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  return NextResponse.json(cliente);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { nome, telefone, cpf, score } = body;

  const cliente = await prisma.cliente.update({
    where: { id: params.id },
    data: {
      ...(nome !== undefined && { nome }),
      ...(telefone !== undefined && { telefone }),
      ...(cpf !== undefined && { cpf }),
      ...(score !== undefined && { score }),
    },
  });

  return NextResponse.json(cliente);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.cliente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
