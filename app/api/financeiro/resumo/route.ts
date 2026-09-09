// ============================================================================
// API: /api/financeiro/resumo
// ----------------------------------------------------------------------------
// GET ?ano=2026&mes=8 (mes 0-11, igual ao Date.getMonth()) -> resumo do mês:
// receitas pagas, despesas pagas, balanço, a receber/a pagar DO MÊS, total
// de despesas do mês (pagas + pendentes), total pendente GERAL (todos os
// meses) a pagar/receber, e quantidade de lançamentos atrasados.
//
// Existe para permitir que a tela principal do Financeiro (app/financeiro)
// e o resumo do mês na Início (components/ResumoMesInicio) naveguem entre
// meses no cliente sem precisar recarregar a página inteira a cada troca.
//
// NOVO: chama fecharFaturasVencidas() antes de somar — se algum cartão tem
// uma fatura cuja data de fechamento já passou, ela vira um Lancamento
// (despesa) na hora, ANTES da soma do mês rodar. Sem isso, a fatura só
// apareceria na soma na próxima vez que alguém abrisse /financeiro/cartoes.
// Essa fatura já entra corretamente no filtro por carteira logo abaixo,
// porque o filtro olha a carteira DA CONTA do lançamento, e a fatura nasce
// com a Conta que o cartão está vinculado (ver lib/cartao.ts).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { statusEfetivoLancamento } from "../../../../lib/financeiro";
import { fecharFaturasVencidas } from "../../../../lib/cartao";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  await fecharFaturasVencidas(sessao.id);

  const params = req.nextUrl.searchParams;
  const deParam = params.get("de");
  const ateParam = params.get("ate");
  const carteiraId = params.get("carteiraId");

  let inicioMes: Date;
  let fimMes: Date;

  if (deParam && ateParam) {
    // Período personalizado (selecionado no calendário) — ignora ano/mes.
    inicioMes = new Date(`${deParam}T00:00:00`);
    fimMes = new Date(`${ateParam}T23:59:59`);
  } else {
    const ano = Number(params.get("ano"));
    const mes = Number(params.get("mes")); // 0-11
    if (Number.isNaN(ano) || Number.isNaN(mes)) {
      return NextResponse.json({ error: "Informe ano e mes, ou um período de/ate." }, { status: 400 });
    }
    inicioMes = new Date(ano, mes, 1);
    fimMes = new Date(ano, mes + 1, 0, 23, 59, 59);
  }

  // O lançamento herda a carteira da conta selecionada. Lançamentos sem
  // conta continuam visíveis apenas no consolidado Geral.
  const filtroCarteira = carteiraId ? { conta: { carteiraId } } : {};
  const [lancamentosDoMes, pendentesDespesa, pendentesReceita, parcelasDoMes] = await Promise.all([
    prisma.lancamento.findMany({ where: { usuarioId: sessao.id, ...filtroCarteira, dataVencimento: { gte: inicioMes, lte: fimMes } } }),
    prisma.lancamento.findMany({ where: { usuarioId: sessao.id, ...filtroCarteira, tipo: "despesa", status: "pendente" } }),
    prisma.lancamento.findMany({ where: { usuarioId: sessao.id, ...filtroCarteira, tipo: "receita", status: "pendente" } }),
    // Parcelas de contratos (empréstimos) com vencimento dentro do período —
    // entram no "saldo total a receber" junto com as receitas do financeiro
    // (ver aReceberContratosDoMes/aReceberTotal abaixo). Carteira não se
    // aplica aqui: contratos não têm conta bancária vinculada por padrão.
    prisma.parcela.findMany({
      where: { contrato: { usuarioId: sessao.id }, status: { not: "pago" }, vencimento: { gte: inicioMes, lte: fimMes } },
    }),
  ]);

  const receitasDoMes = lancamentosDoMes
    .filter((l) => l.tipo === "receita" && l.status === "pago")
    .reduce((s, l) => s + Number(l.valor), 0);
  const despesasDoMes = lancamentosDoMes
    .filter((l) => l.tipo === "despesa" && l.status === "pago")
    .reduce((s, l) => s + Number(l.valor), 0);
  const balanco = receitasDoMes - despesasDoMes;

  // "Do mês" aqui é diferente de totalAPagar/totalAReceber (que são o total
  // pendente GERAL, olhando todos os meses) — filtra pelo mesmo array
  // lancamentosDoMes, então só entra o que vence dentro do mês selecionado.
  const aReceberDoMes = lancamentosDoMes
    .filter((l) => l.tipo === "receita" && l.status === "pendente")
    .reduce((s, l) => s + Number(l.valor), 0);
  const aPagarDoMes = lancamentosDoMes
    .filter((l) => l.tipo === "despesa" && l.status === "pendente")
    .reduce((s, l) => s + Number(l.valor), 0);
  // Total de despesas do mês = já pagas + ainda pendentes (tudo que vence
  // no mês, independente do status já ter sido resolvido ou não).
  const totalDespesasDoMes = despesasDoMes + aPagarDoMes;
  // Mesma ideia pro lado das receitas — usada no card "Receitas - Despesas
  // do mês" da Início, que precisa do total do MÊS (pago + pendente) dos
  // dois lados, não do total pendente GERAL (esse é o totalAReceber abaixo,
  // que olha todos os meses e por isso não deve entrar nessa conta).
  const totalReceitasDoMes = receitasDoMes + aReceberDoMes;

  const totalAPagar = pendentesDespesa.reduce((s, l) => s + Number(l.valor), 0);
  const totalAReceber = pendentesReceita.reduce((s, l) => s + Number(l.valor), 0);
  const atrasadas = [...pendentesDespesa, ...pendentesReceita].filter(
    (l) => statusEfetivoLancamento(l.status, l.dataVencimento) === "atrasado"
  ).length;

  // Saldo total a receber no período = receitas do financeiro + parcelas de
  // contratos (empréstimos) ainda não pagas — pedido explícito: juntar os
  // dois módulos numa única visão de "quanto ainda vou receber".
  const aReceberContratosDoMes = parcelasDoMes.reduce((s, p) => s + Number(p.valor), 0);
  const aReceberTotal = aReceberDoMes + aReceberContratosDoMes;

  return NextResponse.json({
    receitasDoMes,
    despesasDoMes,
    balanco,
    aReceberDoMes,
    aReceberContratosDoMes,
    aReceberTotal,
    aPagarDoMes,
    totalDespesasDoMes,
    totalReceitasDoMes,
    totalAPagar,
    totalAReceber,
    contasAPagar: pendentesDespesa.length,
    contasAReceber: pendentesReceita.length,
    atrasadas,
  });
}
