// ============================================================================
// API: /api/contratos/[id]
// GET    -> detalhe do contrato, com cliente e parcelas
// DELETE -> exclui o contrato (e parcelas, via cascade)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const contrato = await prisma.contrato.findUnique({
    where: { id: params.id },
    include: { cliente: true, parcelas: { orderBy: { numero: "asc" } } },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  return NextResponse.json(contrato);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contrato.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
