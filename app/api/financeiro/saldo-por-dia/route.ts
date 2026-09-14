// ============================================================================
// API: /api/financeiro/saldo-por-dia
// ----------------------------------------------------------------------------
// GET ?de=YYYY-MM-DD&ate=YYYY-MM-DD -> [{ data: "yyyy-mm-dd", saldo: number }]
//     um item por dia do período pedido, com o saldo TOTAL em contas (soma
//     de todas as contas do usuário) ao FINAL daquele dia.
// ----------------------------------------------------------------------------
// Alimenta o agrupamento por dia de "Ver todas transações" (ver
// app/financeiro/transacoes), que pediu pra mostrar não só o total do dia,
// mas o saldo da conta NAQUELE dia — como um extrato bancário.
//
// MESMA fórmula do saldo "atual" já usada em /api/financeiro/contas-resumo
// (saldoInicial de cada conta + receitas pagas − despesas pagas, mais o que
// os contratos descontam/devolvem — ver comentário lá), só que distribuída
// dia a dia em vez de só somada no presente. Reaproveitar a MESMA fórmula
// (em vez de uma versão simplificada) é de propósito: o saldo do ÚLTIMO dia
// do período pedido precisa bater com o "saldo atual" mostrado em outras
// telas, senão vira uma segunda fonte de verdade divergente.
//
// Só entram lançamentos PAGOS com conta definida, e contratos com conta de
// desembolso/destino — pendente e compra no cartão ainda não fechada não
// mexem no saldo real (mesma regra de sempre).
//
// Pra achar o saldo do primeiro dia pedido, soma tudo que já tinha
// acontecido ANTES do período (não só dentro dele) — senão o saldo do dia 1
// do mês pareceria "começar do zero" em vez de carregar o que já existia.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

// Mesma convenção de "chave do dia" já usada em lib/calculos.ts
// (agruparPorDia/rotuloDia): trata a data guardada (meia-noite UTC) como o
// dia que ela representa, em vez de reinterpretar no fuso de quem roda o
// código — evita um desvio de dia entre servidor e o resto do app.
function chaveDia(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const de = params.get("de");
  const ate = params.get("ate");
  if (!de || !ate) {
    return NextResponse.json({ error: "Informe o período (de/ate)." }, { status: 400 });
  }
  const fimPeriodo = new Date(`${ate}T23:59:59`);

  const [contas, lancamentosPagos, contratos] = await Promise.all([
    prisma.conta.findMany({ where: { usuarioId: sessao.id }, select: { saldoInicial: true } }),
    prisma.lancamento.findMany({
      where: { usuarioId: sessao.id, status: "pago", contaId: { not: null }, dataPagamento: { lte: fimPeriodo } },
      select: { dataPagamento: true, tipo: true, valor: true, valorPago: true },
    }),
    prisma.contrato.findMany({
      where: { usuarioId: sessao.id, criadoEm: { lte: fimPeriodo } },
      select: {
        criadoEm: true,
        contaDesembolsoId: true,
        valorEmprestado: true,
        parcelas: {
          where: { status: "pago", pagoEm: { lte: fimPeriodo } },
          select: { valor: true, valorPago: true, contaId: true, pagoEm: true },
        },
      },
    }),
  ]);

  const saldoInicialTotal = contas.reduce((s, c) => s + Number(c.saldoInicial), 0);

  // Soma líquida de cada dia que teve algum movimento — dias sem nada não
  // entram aqui, e por isso não alteram o saldo acumulado ao passar por eles.
  const deltaPorDia = new Map<string, number>();
  function somar(chave: string, valor: number) {
    deltaPorDia.set(chave, (deltaPorDia.get(chave) ?? 0) + valor);
  }

  for (const l of lancamentosPagos) {
    if (!l.dataPagamento) continue;
    somar(chaveDia(l.dataPagamento), Number(l.valorPago ?? l.valor) * (l.tipo === "receita" ? 1 : -1));
  }

  for (const c of contratos) {
    // Empréstimo descontado de uma conta: sai da conta na data em que o
    // contrato foi criado (não existe uma "data de desembolso" separada).
    if (c.contaDesembolsoId) {
      somar(chaveDia(c.criadoEm), -Number(c.valorEmprestado));
    }
    for (const p of c.parcelas) {
      const contaDestino = p.contaId ?? c.contaDesembolsoId;
      if (!contaDestino || !p.pagoEm) continue; // sem conta escolhida: não mexe em saldo
      somar(chaveDia(p.pagoEm), Number(p.valorPago ?? p.valor));
    }
  }

  // Soma tudo que já tinha acontecido ANTES do período pedido, pra o saldo
  // do primeiro dia já carregar o que veio de antes (não "começar do zero").
  let acumulado = saldoInicialTotal;
  for (const [chave, delta] of deltaPorDia) {
    if (chave < de) acumulado += delta;
  }

  // Caminha dia a dia dentro do período, em UTC puro (sem risco de horário
  // de verão/fuso local bagunçar a contagem de dias).
  const [anoDe, mesDe, diaDe] = de.split("-").map(Number);
  const [anoAte, mesAte, diaAte] = ate.split("-").map(Number);
  const fimMs = Date.UTC(anoAte, mesAte - 1, diaAte);

  const resultado: { data: string; saldo: number }[] = [];
  for (let cursorMs = Date.UTC(anoDe, mesDe - 1, diaDe); cursorMs <= fimMs; cursorMs += 86400000) {
    const chave = new Date(cursorMs).toISOString().slice(0, 10);
    acumulado += deltaPorDia.get(chave) ?? 0;
    resultado.push({ data: chave, saldo: acumulado });
  }

  return NextResponse.json(resultado);
}
