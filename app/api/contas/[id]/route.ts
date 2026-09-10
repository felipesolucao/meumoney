// ============================================================================
// API: /api/contas/[id]
// PATCH  -> renomeia a conta, troca o ícone e/ou ajusta o saldo inicial
// DELETE -> exclui a conta/carteira do usuário logado
// ----------------------------------------------------------------------------
// "Ajustar o saldo" da conta (pedido do editor de contas bancárias) mexe no
// campo saldoInicial, não num "saldo atual" — o saldo atual nunca é gravado
// direto, ele é sempre recalculado em /api/financeiro/contas-resumo a partir
// de saldoInicial + lançamentos pagos daquela conta. Isso evita que o saldo
// mostrado no app fique dessincronizado do extrato de lançamentos.
//
// Lançamentos, contratos (contaDesembolsoId) e parcelas (contaId) que já
// usam essa conta NÃO são apagados ao excluir: a coluna correspondente vira
// NULL (ON DELETE SET NULL, ver schema), igual acontece hoje quando se
// exclui uma categoria.
//
// BUGFIX: CartaoCredito.contaId é OBRIGATÓRIO (todo cartão precisa de uma
// conta que pague a fatura) — excluir uma conta com cartão vinculado dava
// erro de chave estrangeira no banco (P2003) sem tratamento nenhum, e o
// fetch do frontend quebrava ao tentar ler a resposta de erro como JSON
// (voltava uma página de erro HTML), fazendo o botão "Excluir" parecer que
// não fazia nada. Agora barra antes, com uma mensagem clara.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.conta.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const body = await req.json();
  const { nome, icone, saldoInicial, carteiraId } = body as { nome?: string; icone?: string; saldoInicial?: number; carteiraId?: string | null };

  if (nome !== undefined && !nome.trim()) {
    return NextResponse.json({ error: "O nome da conta não pode ficar em branco." }, { status: 400 });
  }
  if (saldoInicial !== undefined && Number.isNaN(Number(saldoInicial))) {
    return NextResponse.json({ error: "Saldo inválido." }, { status: 400 });
  }
  if (carteiraId) {
    const carteira = await prisma.carteira.findFirst({ where: { id: carteiraId, usuarioId: sessao.id } });
    if (!carteira) return NextResponse.json({ error: "Carteira não encontrada." }, { status: 400 });
  }

  const conta = await prisma.conta.update({
    where: { id: params.id },
    data: {
      ...(nome !== undefined ? { nome: nome.trim() } : {}),
      ...(icone !== undefined ? { icone } : {}),
      ...(saldoInicial !== undefined ? { saldoInicial: Number(saldoInicial) } : {}),
      ...(carteiraId !== undefined ? { carteiraId: carteiraId || null } : {}),
    },
  });
  return NextResponse.json(conta);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.conta.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const cartoesVinculados = await prisma.cartaoCredito.findMany({
    where: { contaId: params.id },
    select: { nome: true },
  });
  if (cartoesVinculados.length > 0) {
    const nomes = cartoesVinculados.map((c) => c.nome).join(", ");
    return NextResponse.json(
      { error: `Esta conta paga a fatura de ${cartoesVinculados.length === 1 ? "um cartão" : "cartões"} (${nomes}). Troque a conta desse(s) cartão(ões) em Contas antes de excluir, ou exclua o(s) cartão(ões) primeiro.` },
      { status: 400 }
    );
  }

  try {
    await prisma.conta.delete({ where: { id: params.id } });
  } catch {
    // Rede de segurança pra qualquer outra restrição de chave estrangeira
    // não prevista acima — evita que o erro do banco vaze como página HTML
    // pro frontend (que espera sempre JSON).
    return NextResponse.json(
      { error: "Não foi possível excluir esta conta — ela ainda tem registros vinculados." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
