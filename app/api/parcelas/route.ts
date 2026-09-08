// ============================================================================
// API: /api/parcelas
// GET -> lista parcelas de todos os contratos DO USUÁRIO LOGADO, com filtros:
//   ?de=YYYY-MM-DD&ate=YYYY-MM-DD   -> intervalo de vencimento
//   ?status=a_vencer|atrasado|pago  -> filtro por status
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");
  const status = searchParams.get("status");

  const where: any = { contrato: { usuarioId: sessao.id } };
  if (de || ate) {
    where.vencimento = {};
    if (de) where.vencimento.gte = new Date(de);
    if (ate) where.vencimento.lte = new Date(ate);
  }

  // O status "atrasado" é calculado pela data (não depende de um job em
  // segundo plano atualizar o banco): qualquer parcela não paga cujo
  // vencimento já passou é considerada atrasada.
  if (status === "atrasado") {
    where.status = { not: "pago" };
    where.vencimento = { lt: new Date(new Date().toDateString()) };
  } else if (status === "pendente") {
    where.status = { not: "pago" };
  } else if (status) {
    where.status = status;
  }

  const parcelas = await prisma.parcela.findMany({
    where,
    orderBy: { vencimento: "asc" },
    include: { contrato: { include: { cliente: true } } },
  });

  return NextResponse.json(parcelas);
}
