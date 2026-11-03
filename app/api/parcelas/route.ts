// ============================================================================
// API: /api/parcelas
// GET -> lista parcelas de todos os contratos DO USUÁRIO LOGADO, com filtros:
//   ?de=YYYY-MM-DD&ate=YYYY-MM-DD   -> intervalo de vencimento
//   ?status=a_vencer|atrasado|pago  -> filtro por status
// ============================================================================
import type { Prisma } from "@prisma/client";
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

  const where: Prisma.ParcelaWhereInput = { contrato: { usuarioId: sessao.id } };
  if (de || ate) {
    const intervalo: Prisma.DateTimeFilter = {};
    if (de) intervalo.gte = new Date(de);
    if (ate) intervalo.lt = new Date(new Date(ate).getTime() + 86400000);
    if (status === "pago") where.pagoEm = intervalo;
    else where.vencimento = intervalo;
  }


  // O status "atrasado" é calculado pela data (não depende de um job em
  // segundo plano atualizar o banco): qualquer parcela não paga cujo
  // vencimento já passou é considerada atrasada.
  if (status === "atrasado") {
    where.status = { not: "pago" };
    where.vencimento = { lt: new Date(new Date().toDateString()) };
  } else if (status === "pendente") {
    where.status = { not: "pago" };
  } else if (status === "pago") {
    // Recebimentos incluem parcelas parcialmente pagas, usando a mesma origem do CRM.
    where.OR = [{ valorPago: { gt: 0 } }, { status: "pago", valorPago: null }];
    if (!where.pagoEm) where.pagoEm = { not: null };
  } else if (status === "a_vencer") {
    where.status = status;
  }

  const parcelas = await prisma.parcela.findMany({
    where,
    orderBy: { vencimento: "asc" },
    include: { contrato: { include: { cliente: true } } },
  });

  return NextResponse.json(parcelas);
}
