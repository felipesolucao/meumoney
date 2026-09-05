// ============================================================================
// API: /api/parcelas/[id]
// PATCH -> ação sobre uma parcela:
//   { acao: "pagar" }                          -> marca como paga hoje
//   { acao: "renegociar", novoVencimento }      -> altera a data de vencimento
// Depois de qualquer alteração, recalcula o status geral do contrato.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { acao, novoVencimento } = body as { acao: "pagar" | "renegociar"; novoVencimento?: string };

  const parcelaAtual = await prisma.parcela.findUnique({ where: { id: params.id } });
  if (!parcelaAtual) {
    return NextResponse.json({ error: "Parcela não encontrada." }, { status: 404 });
  }

  if (acao === "pagar") {
    await prisma.parcela.update({
      where: { id: params.id },
      data: { status: "pago", pagoEm: new Date(), valorPago: parcelaAtual.valor },
    });
  } else if (acao === "renegociar") {
    if (!novoVencimento) {
      return NextResponse.json({ error: "Informe a nova data de vencimento." }, { status: 400 });
    }
    await prisma.parcela.update({
      where: { id: params.id },
      data: { vencimento: new Date(novoVencimento), status: "a_vencer" },
    });
  } else {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  // --- Recalcula o status geral do contrato -------------------------------
  const parcelas = await prisma.parcela.findMany({ where: { contratoId: parcelaAtual.contratoId } });
  const hoje = new Date(new Date().toDateString());

  const todasPagas = parcelas.every((p) => p.status === "pago");
  const algumaAtrasada = parcelas.some((p) => p.status !== "pago" && new Date(p.vencimento) < hoje);

  const novoStatus = todasPagas ? "quitado" : algumaAtrasada ? "atrasado" : "em_dia";

  await prisma.contrato.update({
    where: { id: parcelaAtual.contratoId },
    data: { status: novoStatus },
  });

  const parcelaAtualizada = await prisma.parcela.findUnique({ where: { id: params.id } });
  return NextResponse.json(parcelaAtualizada);
}
