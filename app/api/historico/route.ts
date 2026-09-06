// ============================================================================
// API: /api/historico
// ----------------------------------------------------------------------------
// GET -> lista as ações registradas no sistema, mais recentes primeiro.
//   ?entidade=Contrato|Parcela|Cliente|Lancamento   filtra por tipo de registro
//   ?de=YYYY-MM-DD&ate=YYYY-MM-DD                   filtra por período
// Usada pela tela de Histórico, tanto no Financeiro (entidade=Lancamento)
// quanto em Contratos (entidade=Contrato — que também mostra as ações de
// Parcela, já que pagar/renegociar uma parcela é uma ação sobre o contrato).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const entidade = params.get("entidade");
  const de = params.get("de");
  const ate = params.get("ate");

  const where: Record<string, unknown> = { usuarioId: sessao.id };

  if (entidade === "Contrato") {
    // A tela de Histórico de Contratos mostra ações de Contrato E de Parcela
    // juntas, já que uma parcela paga/renegociada é sempre parte da história
    // de um contrato específico.
    where.entidade = { in: ["Contrato", "Parcela"] };
  } else if (entidade) {
    where.entidade = entidade;
  }

  if (de || ate) {
    where.criadoEm = {
      ...(de ? { gte: new Date(`${de}T00:00:00`) } : {}),
      ...(ate ? { lte: new Date(`${ate}T23:59:59`) } : {}),
    };
  }

  const historico = await prisma.historicoAcao.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    take: 200,
  });

  return NextResponse.json(historico);
}
