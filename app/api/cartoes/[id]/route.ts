// ============================================================================
// API: /api/cartoes/[id]
// PATCH  -> edita nome, ícone, bandeira, limite, dias de fechamento/vencimento,
//           conta que paga a fatura e/ou uso (pessoal/empresarial).
//           OBS: mudar os dias de fechamento/vencimento só vale pros PRÓXIMOS
//           ciclos — faturas já abertas/fechadas mantêm as datas com que
//           nasceram (ver lib/cartao.ts).
// DELETE -> apaga o cartão. Faturas e compras dele somem junto (cascade, ver
//           schema) — MAS os Lancamentos de faturas que já fecharam ficam
//           intactos (são um registro financeiro independente a essa altura,
//           igual acontece quando se exclui uma Conta ou Categoria).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import type { OrigemFinanceira } from "../../../../lib/financeiro";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.cartaoCredito.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });

  const body = await req.json();
  const { nome, icone, bandeira, limite, diaFechamento, diaVencimento, contaId, origem } = body as {
    nome?: string;
    icone?: string;
    bandeira?: string | null;
    limite?: number | null;
    diaFechamento?: number;
    diaVencimento?: number;
    contaId?: string;
    origem?: OrigemFinanceira;
  };

  if (nome !== undefined && !nome.trim()) {
    return NextResponse.json({ error: "O nome do cartão não pode ficar em branco." }, { status: 400 });
  }
  if (diaFechamento !== undefined && (!Number.isInteger(diaFechamento) || diaFechamento < 1 || diaFechamento > 31)) {
    return NextResponse.json({ error: "Dia de fechamento inválido (use um valor de 1 a 31)." }, { status: 400 });
  }
  if (diaVencimento !== undefined && (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 31)) {
    return NextResponse.json({ error: "Dia de vencimento inválido (use um valor de 1 a 31)." }, { status: 400 });
  }
  if (contaId !== undefined) {
    const conta = await prisma.conta.findFirst({ where: { id: contaId, usuarioId: sessao.id } });
    if (!conta) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  const cartao = await prisma.cartaoCredito.update({
    where: { id: params.id },
    data: {
      ...(nome !== undefined ? { nome: nome.trim() } : {}),
      ...(icone !== undefined ? { icone } : {}),
      ...(bandeira !== undefined ? { bandeira: bandeira || null } : {}),
      ...(limite !== undefined ? { limite: limite == null ? null : Number(limite) } : {}),
      ...(diaFechamento !== undefined ? { diaFechamento } : {}),
      ...(diaVencimento !== undefined ? { diaVencimento } : {}),
      ...(contaId !== undefined ? { contaId } : {}),
      ...(origem !== undefined ? { origem } : {}),
    },
  });
  return NextResponse.json(cartao);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.cartaoCredito.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });

  await prisma.cartaoCredito.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
