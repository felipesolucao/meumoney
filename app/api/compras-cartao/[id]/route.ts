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
import { atualizarCompraCartao } from "../../../../lib/cartao";

// GET -> detalhe de uma compra do cartão (tela /financeiro/cartoes/compra/[id]
// e modo de edição de /financeiro/novo).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const compra = await prisma.compraCartao.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: {
      categoria: { select: { nome: true, icone: true } },
      cartao: { select: { id: true, nome: true, icone: true } },
      fatura: { select: { id: true, status: true, anoReferencia: true, mesReferencia: true } },
    },
  });
  if (!compra) return NextResponse.json({ error: "Compra não encontrada." }, { status: 404 });

  return NextResponse.json(compra);
}

// PATCH -> ajusta valor/data/descrição/categoria/observações de uma compra.
// Só permitido enquanto a fatura dela ainda estiver "aberta" (ver
// atualizarCompraCartao em lib/cartao.ts) — usado pelo popup rápido "Ajustar
// valor" e pela tela /financeiro/novo em modo de edição.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { descricao, valor, dataCompra, categoriaId, observacoes } = body as {
    descricao?: string;
    valor?: number;
    dataCompra?: string;
    categoriaId?: string | null;
    observacoes?: string | null;
  };

  const resultado = await atualizarCompraCartao({
    usuarioId: sessao.id,
    compraId: params.id,
    descricao,
    valor: valor != null ? Number(valor) : undefined,
    dataCompra: dataCompra ? new Date(dataCompra) : undefined,
    categoriaId,
    observacoes,
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }
  return NextResponse.json(resultado.compra);
}

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
