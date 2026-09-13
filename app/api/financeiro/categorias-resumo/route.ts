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
// "Relatórios" (app/financeiro/relatorios), e também o resumo compacto
// "Despesas por categoria" da Início (components/DespesasPorCategoriaInicio).
//
// Também devolve os 5 lançamentos de maior valor do período ("maiores
// gastos"/"maiores receitas"), useful pra tela destacar isso separado do
// agrupamento por categoria.
//
// Só considera lançamentos PAGOS: um gasto ainda pendente não é um "gasto"
// de fato até acontecer, e misturar pendente com pago distorceria o
// percentual de cada categoria.
//
// NOVO: quando tipo=despesa, as compras no cartão de crédito (CompraCartao)
// também entram na conta — pela data da COMPRA, não da fatura. Antes, uma
// compra só aparecia aqui quando a fatura inteira fechava E o Lancamento
// consolidado dela era pago, o que podia demorar semanas e sempre caía como
// "Sem categoria" (o Lancamento da fatura não tem categoria própria — ver
// fecharFaturasVencidas em lib/cartao.ts). Pra não contar a mesma despesa
// duas vezes quando isso acontece, o Lancamento gerado pelo fechamento da
// fatura (identificado pela relação com FaturaCartao) é excluído da soma:
// a despesa dele já está representada, individualmente e com a categoria
// certa, pelas CompraCartao que a compõem.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import type { TipoLancamento } from "../../../../lib/financeiro";
import { corCategoria } from "../../../../lib/coresCategoria";

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const tipo = (params.get("tipo") as TipoLancamento) || "despesa";
  const deParam = params.get("de");
  const ateParam = params.get("ate");
  const carteiraId = params.get("carteiraId");

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

  // O lançamento herda a carteira da conta selecionada — mesmo filtro usado
  // em /api/financeiro/resumo (ver comentário lá).
  const filtroCarteira = carteiraId ? { conta: { carteiraId } } : {};
  const lancamentos = await prisma.lancamento.findMany({
    where: {
      usuarioId: sessao.id,
      tipo,
      status: "pago",
      dataVencimento: { gte: inicio, lte: fim },
      ...filtroCarteira,
      // Ver NOVO no topo do arquivo — evita contar a fatura em dobro.
      ...(tipo === "despesa" ? { faturaCartao: { is: null } } : {}),
    },
    include: { categoria: true },
    orderBy: { dataVencimento: "desc" },
  });

  // Formato comum entre Lancamento e CompraCartao, pra agrupar e ordenar os
  // dois juntos sem duplicar a lógica de categoria/total abaixo.
  type Item = {
    id: string;
    descricao: string;
    valor: number;
    data: Date;
    categoriaId: string | null;
    categoriaNome: string | null;
    categoriaIcone: string | null;
  };

  const itens: Item[] = lancamentos.map((l) => ({
    id: l.id,
    descricao: l.descricao,
    valor: Number(l.valorPago ?? l.valor),
    data: l.dataVencimento,
    categoriaId: l.categoriaId,
    categoriaNome: l.categoria?.nome ?? null,
    categoriaIcone: l.categoria?.icone ?? null,
  }));

  if (tipo === "despesa") {
    // A carteira de uma compra no cartão vem da conta que PAGA o cartão
    // (mesma regra usada pro Lancamento da fatura, ver lib/cartao.ts).
    const filtroCartaoCarteira = carteiraId ? { cartao: { conta: { carteiraId } } } : {};
    const comprasCartao = await prisma.compraCartao.findMany({
      where: {
        usuarioId: sessao.id,
        dataCompra: { gte: inicio, lte: fim },
        ...filtroCartaoCarteira,
      },
      include: { categoria: true },
    });

    itens.push(
      ...comprasCartao.map((c) => ({
        id: `cartao-${c.id}`,
        descricao: c.descricao,
        valor: Number(c.valor),
        data: c.dataCompra,
        categoriaId: c.categoriaId,
        categoriaNome: c.categoria?.nome ?? null,
        categoriaIcone: c.categoria?.icone ?? null,
      }))
    );
  }

  const total = itens.reduce((s, i) => s + i.valor, 0);

  // --- Agrupamento por categoria --------------------------------------------
  type Grupo = { id: string; nome: string; icone: string; cor: string; total: number };
  const grupos = new Map<string, Grupo>();

  for (const i of itens) {
    const chave = i.categoriaId ?? "sem-categoria";
    const existente = grupos.get(chave);
    if (existente) {
      existente.total += i.valor;
    } else {
      grupos.set(chave, {
        id: chave,
        nome: i.categoriaNome ?? "Sem categoria",
        icone: i.categoriaIcone ?? "🧾",
        cor: corCategoria(i.categoriaId),
        total: i.valor,
      });
    }
  }

  const categorias = Array.from(grupos.values())
    .sort((a, b) => b.total - a.total)
    .map((g) => ({ ...g, percentual: total > 0 ? (g.total / total) * 100 : 0 }));

  // --- Top 5 itens individuais de maior valor -------------------------------
  const maiores = [...itens]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      descricao: i.descricao,
      valor: i.valor,
      data: i.data,
      categoriaNome: i.categoriaNome,
      categoriaIcone: i.categoriaIcone,
    }));

  return NextResponse.json({ tipo, total, categorias, maiores });
}
