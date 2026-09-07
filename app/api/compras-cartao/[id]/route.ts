// ============================================================================
// API: /api/compras-cartao/[id]
// DELETE -> remove uma compra do cartão e desconta o valor dela da fatura.
//           Só permitido enquanto a fatura ainda estiver "aberta" — depois
//           que ela fecha e vira um Lancamento, a correção é editar/excluir
//           esse Lancamento normalmente em /financeiro (ele já é o total).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const compra = await prisma.compraCartao.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { fatura: true },
  });
  if (!compra) return NextResponse.json({ error: "Compra não encontrada." }, { status: 404 });

  if (compra.fatura.status !== "aberta") {
    return NextResponse.json(
      { error: "A fatura desta compra já fechou e não pode mais ser alterada por aqui." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.compraCartao.delete({ where: { id: compra.id } }),
    prisma.faturaCartao.update({
      where: { id: compra.faturaId },
      data: { valorTotal: { decrement: compra.valor } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
