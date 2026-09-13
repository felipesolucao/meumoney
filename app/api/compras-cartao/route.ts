// ============================================================================
// API: /api/compras-cartao
// GET  -> lista compras no cartão, com filtros por query string:
//         ?categoriaId=...   (usado pela tela de detalhe de categoria, que
//         sem isso só mostrava o histórico de Lancamento — as compras no
//         cartão daquela categoria ficavam de fora, mesmo somando no total
//         de /api/financeiro/categorias-resumo)
//         ?cartaoId=...      ?de=YYYY-MM-DD&ate=YYYY-MM-DD (pela data da compra)
//
// POST -> lança uma compra num cartão de crédito. Não cria um Lancamento —
//         só soma na fatura do ciclo certo (ver lib/cartao.ts). Usado pela
//         tela "Nova transação" quando a forma de pagamento escolhida é
//         "Cartão de crédito" em vez de "Conta/Carteira".
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { registrarCompraCartao } from "../../../lib/cartao";
import { obterSessao } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const categoriaId = params.get("categoriaId");
  const cartaoId = params.get("cartaoId");
  const de = params.get("de");
  const ate = params.get("ate");

  const where: Record<string, unknown> = { usuarioId: sessao.id };
  if (categoriaId) where.categoriaId = categoriaId;
  if (cartaoId) where.cartaoId = cartaoId;
  if (de || ate) {
    where.dataCompra = {
      ...(de ? { gte: new Date(`${de}T00:00:00`) } : {}),
      ...(ate ? { lte: new Date(`${ate}T23:59:59`) } : {}),
    };
  }

  const compras = await prisma.compraCartao.findMany({
    where,
    include: { categoria: true, cartao: true, fatura: true },
    orderBy: { dataCompra: "desc" },
  });

  return NextResponse.json(compras);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { cartaoId, descricao, valor, dataCompra, categoriaId, observacoes } = body as {
    cartaoId: string;
    descricao: string;
    valor: number;
    dataCompra: string;
    categoriaId?: string;
    observacoes?: string;
  };

  if (!cartaoId || !descricao || !valor || !dataCompra) {
    return NextResponse.json({ error: "Preencha cartão, descrição, valor e data." }, { status: 400 });
  }

  const resultado = await registrarCompraCartao({
    usuarioId: sessao.id,
    cartaoId,
    descricao,
    valor: Number(valor),
    dataCompra: new Date(dataCompra),
    categoriaId: categoriaId || undefined,
    observacoes: observacoes || undefined,
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }
  return NextResponse.json(resultado.compra, { status: 201 });
}
