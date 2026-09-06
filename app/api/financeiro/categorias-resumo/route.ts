// ============================================================================
// API: /api/financeiro/categorias-resumo
// ----------------------------------------------------------------------------
// GET ?tipo=despesa|receita (padrão despesa)
//     &ano=2026&mes=8              (mes 0-11, igual ao Date.getMonth())
//     ou &de=YYYY-MM-DD&ate=YYYY-MM-DD  (período personalizado)
// ----------------------------------------------------------------------------
// Agrupa os lançamentos PAGOS do tipo escolhido por categoria, calculando o
// total e o percentual de cada uma sobre o total do período — os dados que
// alimentam o gráfico (pizza/barras) e a lista de percentuais da tela
// "Relatórios" (app/financeiro/relatorios).
//
// Também devolve os 5 lançamentos de maior valor do período ("maiores
// gastos"/"maiores receitas"), useful pra tela destacar isso separado do
// agrupamento por categoria.
//
// Só considera lançamentos PAGOS: um gasto ainda pendente não é um "gasto"
// de fato até acontecer, e misturar pendente com pago distorceria o
// percentual de cada categoria.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import type { TipoLancamento } from "../../../../lib/financeiro";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const tipo = (params.get("tipo") as TipoLancamento) || "despesa";
  const deParam = params.get("de");
  const ateParam = params.get("ate");

  let inicio: Date;
  let fim: Date;

  if (deParam && ateParam) {
    inicio = new Date(`${deParam}T00:00:00`);
    fim = new Date(`${ateParam}T23:59:59`);
  } else {
    const ano = Number(params.get("ano"));
    const mes = Number(params.get("mes"));
    if (Number.isNaN(ano) || Number.isNaN(mes)) {
      return NextResponse.json({ error: "Informe ano e mes, ou um período de/ate." }, { status: 400 });
    }
    inicio = new Date(ano, mes, 1);
    fim = new Date(ano, mes + 1, 0, 23, 59, 59);
  }

  const lancamentos = await prisma.lancamento.findMany({
    where: {
      usuarioId: sessao.id,
      tipo,
      status: "pago",
      dataVencimento: { gte: inicio, lte: fim },
    },
    include: { categoria: true },
    orderBy: { dataVencimento: "desc" },
  });

  const total = lancamentos.reduce((s, l) => s + Number(l.valorPago ?? l.valor), 0);

  // --- Agrupamento por categoria --------------------------------------------
  type Grupo = { id: string; nome: string; icone: string; cor: string; total: number };
  const grupos = new Map<string, Grupo>();

  for (const l of lancamentos) {
    const valor = Number(l.valorPago ?? l.valor);
    const chave = l.categoriaId ?? "sem-categoria";
    const existente = grupos.get(chave);
    if (existente) {
      existente.total += valor;
    } else {
      grupos.set(chave, {
        id: chave,
        nome: l.categoria?.nome ?? "Sem categoria",
        icone: l.categoria?.icone ?? "🧾",
        cor: l.categoria?.cor ?? "#6b7280",
        total: valor,
      });
    }
  }

  const categorias = Array.from(grupos.values())
    .sort((a, b) => b.total - a.total)
    .map((g) => ({ ...g, percentual: total > 0 ? (g.total / total) * 100 : 0 }));

  // --- Top 5 lançamentos individuais de maior valor -------------------------
  const maiores = [...lancamentos]
    .sort((a, b) => Number(b.valorPago ?? b.valor) - Number(a.valorPago ?? a.valor))
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      descricao: l.descricao,
      valor: Number(l.valorPago ?? l.valor),
      data: l.dataVencimento,
      categoriaNome: l.categoria?.nome ?? null,
      categoriaIcone: l.categoria?.icone ?? null,
    }));

  return NextResponse.json({ tipo, total, categorias, maiores });
}
