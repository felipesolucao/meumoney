// ============================================================================
// API: /api/financeiro/contas-resumo
// ----------------------------------------------------------------------------
// GET -> lista as contas/carteiras do usuário logado, cada uma com o saldo
// ATUAL já calculado, mais o total somado de todas elas — os dados que a
// tela "Contas" (app/financeiro/contas) mostra num hero card, no mesmo
// espírito do card "Contas" do app de referência.
//
// O saldo de cada conta é sempre derivado, nunca gravado direto:
//   saldoAtual = saldoInicial + receitas PAGAS dessa conta - despesas PAGAS dessa conta
//                - (empréstimos descontados dessa conta - parcelas já pagas desses empréstimos)
// Lançamentos pendentes/atrasados não entram na conta, porque ainda não
// "aconteceram" de fato no banco/carteira.
//
// O último termo é o desconto de contratos "descontados de uma conta" (ver
// Contrato.contaDesembolsoId, criado em /contratos/novo) — de propósito NÃO
// é um Lancamento (um empréstimo não é uma "despesa"/"receita" do dia a dia,
// não deve aparecer nas telas de Despesas/Receitas), mas ainda precisa
// mexer no saldo: o valor emprestado desconta na hora da conta de
// desembolso, e cada parcela paga devolve o valor pra conta escolhida no
// popup "Receber pagamento" (Parcela.contaId — pode ser uma conta diferente
// da de desembolso; sem escolha, cai na própria conta de desembolso).
// ============================================================================
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function GET(req: Request) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const carteiraId = new URL(req.url).searchParams.get("carteiraId");
  const filtroCarteira = carteiraId ? { carteiraId } : {};
  const [contas, lancamentosPagos, contratosDesembolso] = await Promise.all([
    prisma.conta.findMany({ where: { usuarioId: sessao.id, ...filtroCarteira }, orderBy: { nome: "asc" } }),
    prisma.lancamento.findMany({
      where: { usuarioId: sessao.id, status: "pago", contaId: { not: null } },
      select: { contaId: true, tipo: true, valorPago: true, valor: true },
    }),
    prisma.contrato.findMany({
      where: { usuarioId: sessao.id, contaDesembolsoId: { not: null } },
      select: {
        contaDesembolsoId: true,
        valorEmprestado: true,
        parcelas: { select: { status: true, valor: true, valorPago: true, contaId: true } },
      },
    }),
  ]);

  // Soma receitas/despesas pagas por conta num único Map, pra não precisar
  // rodar um findMany separado (e uma soma) pra cada conta individualmente.
  const movimentoPorConta = new Map<string, number>();
  for (const l of lancamentosPagos) {
    if (!l.contaId) continue;
    const valor = Number(l.valorPago ?? l.valor);
    const delta = l.tipo === "receita" ? valor : -valor;
    movimentoPorConta.set(l.contaId, (movimentoPorConta.get(l.contaId) ?? 0) + delta);
  }

  // Cada contrato descontado de uma conta tira o valor emprestado dessa
  // conta na hora. Cada parcela paga devolve o valor recebido pra conta
  // escolhida no popup "Receber pagamento" (Parcela.contaId) — sem escolha
  // explícita (pagamentos antigos, antes desse campo existir), cai na conta
  // de desembolso do contrato, mantendo o comportamento de sempre.
  for (const c of contratosDesembolso) {
    if (!c.contaDesembolsoId) continue;
    movimentoPorConta.set(
      c.contaDesembolsoId,
      (movimentoPorConta.get(c.contaDesembolsoId) ?? 0) - Number(c.valorEmprestado)
    );
    for (const p of c.parcelas) {
      if (p.status !== "pago") continue;
      const contaDestino = p.contaId ?? c.contaDesembolsoId;
      const valorDevolvido = Number(p.valorPago ?? p.valor);
      movimentoPorConta.set(contaDestino, (movimentoPorConta.get(contaDestino) ?? 0) + valorDevolvido);
    }
  }

  const contasComSaldo = contas.map((conta) => {
    const saldoInicial = Number(conta.saldoInicial);
    const saldoAtual = saldoInicial + (movimentoPorConta.get(conta.id) ?? 0);
    return {
      id: conta.id,
      nome: conta.nome,
      icone: conta.icone,
      carteiraId: conta.carteiraId,
      saldoInicial,
      saldoAtual,
    };
  });

  const totalGeral = contasComSaldo.reduce((s, c) => s + c.saldoAtual, 0);

  return NextResponse.json({ contas: contasComSaldo, totalGeral });
}
