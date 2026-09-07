// ============================================================================
// API: /api/cartoes
// GET  -> lista os cartões de crédito do usuário logado, cada um já com a
//         fatura ATUAL (aberta) — valor até agora, data de fechamento e de
//         vencimento — pra tela de Contas mostrar de cara.
// POST -> cadastra um novo cartão, vinculado a uma Conta/carteira (a que
//         paga a fatura) e já abre a primeira fatura (competência de hoje),
//         pra a tela de extrato não nascer vazia.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";
import { fecharFaturasVencidas, obterOuCriarFatura, competenciaDaCompra } from "../../../lib/cartao";
import type { OrigemFinanceira } from "../../../lib/financeiro";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  await fecharFaturasVencidas(sessao.id);

  const cartoes = await prisma.cartaoCredito.findMany({
    where: { usuarioId: sessao.id, ativo: true },
    include: {
      conta: { select: { id: true, nome: true, icone: true } },
      faturas: { where: { status: "aberta" }, take: 1 },
    },
    orderBy: { nome: "asc" },
  });

  const resultado = cartoes.map(({ faturas, ...cartao }) => ({
    ...cartao,
    faturaAtual: faturas[0] ?? null,
  }));

  return NextResponse.json(resultado);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { nome, icone, bandeira, limite, diaFechamento, diaVencimento, contaId, origem } = body as {
    nome: string;
    icone?: string;
    bandeira?: string;
    limite?: number;
    diaFechamento: number;
    diaVencimento: number;
    contaId: string;
    origem?: OrigemFinanceira;
  };

  if (!nome || !contaId) {
    return NextResponse.json({ error: "Informe o nome do cartão e a conta que paga a fatura." }, { status: 400 });
  }
  if (!Number.isInteger(Number(diaFechamento)) || diaFechamento < 1 || diaFechamento > 31) {
    return NextResponse.json({ error: "Dia de fechamento inválido (use um valor de 1 a 31)." }, { status: 400 });
  }
  if (!Number.isInteger(Number(diaVencimento)) || diaVencimento < 1 || diaVencimento > 31) {
    return NextResponse.json({ error: "Dia de vencimento inválido (use um valor de 1 a 31)." }, { status: 400 });
  }

  const conta = await prisma.conta.findFirst({ where: { id: contaId, usuarioId: sessao.id } });
  if (!conta) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const cartao = await prisma.cartaoCredito.create({
    data: {
      nome,
      icone: icone || undefined,
      bandeira: bandeira || undefined,
      limite: limite != null && limite !== ("" as unknown as number) ? Number(limite) : undefined,
      diaFechamento: Number(diaFechamento),
      diaVencimento: Number(diaVencimento),
      origem: origem || "pessoal",
      contaId,
      usuarioId: sessao.id,
    },
  });

  // Já abre a fatura da competência atual, pra tela de extrato não nascer vazia.
  const { ano, mes } = competenciaDaCompra(new Date(), cartao.diaFechamento);
  const faturaAtual = await obterOuCriarFatura(prisma, cartao, ano, mes);

  return NextResponse.json({ ...cartao, faturaAtual }, { status: 201 });
}
