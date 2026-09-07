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
// Lançamentos que já usam essa conta NÃO são apagados ao excluir: a coluna
// contaId deles vira NULL (ON DELETE SET NULL, ver schema), igual acontece
// hoje quando se exclui uma categoria.
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

  await prisma.conta.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
