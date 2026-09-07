// ============================================================================
// API: /api/compras-cartao
// POST -> lança uma compra num cartão de crédito. Não cria um Lancamento —
//         só soma na fatura do ciclo certo (ver lib/cartao.ts). Usado pela
//         tela "Nova transação" quando a forma de pagamento escolhida é
//         "Cartão de crédito" em vez de "Conta/Carteira".
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { registrarCompraCartao } from "../../../lib/cartao";
import { obterSessao } from "../../../lib/auth";

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
