// ============================================================================
// API: /api/financeiro/resumo
// ----------------------------------------------------------------------------
// GET ?ano=2026&mes=8 (mes 0-11, igual ao Date.getMonth()) -> resumo do mês:
// receitas pagas, despesas pagas, balanço, total pendente a pagar/receber e
// quantidade de lançamentos atrasados.
//
// Existe para permitir que a tela principal do Financeiro (app/financeiro)
// navegue entre meses no cliente (antes só existia no /historico) sem
// precisar recarregar a página inteira a cada troca de mês.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { statusEfetivoLancamento } from "../../../../lib/financeiro";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const deParam = params.get("de");
  const ateParam = params.get("ate");

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

  const [lancamentosDoMes, pendentesDespesa, pendentesReceita] = await Promise.all([
    prisma.lancamento.findMany({ where: { usuarioId: sessao.id, dataVencimento: { gte: inicioMes, lte: fimMes } } }),
    prisma.lancamento.findMany({ where: { usuarioId: sessao.id, tipo: "despesa", status: "pendente" } }),
    prisma.lancamento.findMany({ where: { usuarioId: sessao.id, tipo: "receita", status: "pendente" } }),
  ]);

  const receitasDoMes = lancamentosDoMes
    .filter((l) => l.tipo === "receita" && l.status === "pago")
    .reduce((s, l) => s + Number(l.valor), 0);
  const despesasDoMes = lancamentosDoMes
    .filter((l) => l.tipo === "despesa" && l.status === "pago")
    .reduce((s, l) => s + Number(l.valor), 0);
  const balanco = receitasDoMes - despesasDoMes;

  const totalAPagar = pendentesDespesa.reduce((s, l) => s + Number(l.valor), 0);
  const totalAReceber = pendentesReceita.reduce((s, l) => s + Number(l.valor), 0);
  const atrasadas = [...pendentesDespesa, ...pendentesReceita].filter(
    (l) => statusEfetivoLancamento(l.status, l.dataVencimento) === "atrasado"
  ).length;

  return NextResponse.json({
    receitasDoMes,
    despesasDoMes,
    balanco,
    totalAPagar,
    totalAReceber,
    contasAPagar: pendentesDespesa.length,
    contasAReceber: pendentesReceita.length,
    atrasadas,
  });
}
