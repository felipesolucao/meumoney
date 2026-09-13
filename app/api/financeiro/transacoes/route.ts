// ============================================================================
// API: /api/financeiro/transacoes
// ----------------------------------------------------------------------------
// GET ?tipo=transacoes|receitas|despesas|contratos (padrão transacoes)
//     &de=YYYY-MM-DD&ate=YYYY-MM-DD (obrigatório)
//     &busca=texto (opcional — filtra por descrição ou valor)
// ----------------------------------------------------------------------------
// Alimenta a tela "Ver todas transações" (app/financeiro/transacoes) — uma
// lista única e filtrável reunindo os três tipos de "coisa que aconteceu"
// no app: Lancamento (receita/despesa), CompraCartao (despesa no cartão,
// ainda não virou Lancamento — ver lib/cartao.ts) e Parcela de contrato de
// empréstimo. Ao contrário de /api/financeiro/categorias-resumo, aqui NÃO
// se exclui o Lancamento consolidado gerado pelo fechamento de uma fatura:
// esta lista é um HISTÓRICO de eventos (o que aconteceu, incluindo pagar a
// fatura), não uma soma — mostrar os dois não é "contar em dobro" aqui, são
// dois eventos reais em datas diferentes (a compra, depois o pagamento).
//
// "tipo=transacoes" (padrão, aba "Transações") reúne tudo (Lancamento +
// CompraCartao + Parcela); "receitas"/"despesas" restringem a um lado do
// financeiro (despesas ainda inclui CompraCartao); "contratos" mostra só as
// parcelas de empréstimo.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { fecharFaturasVencidas } from "../../../../lib/cartao";

type TransacaoItem = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  entrada: boolean;
  pago: boolean;
  contaNome: string | null;
  contaIcone: string | null;
  categoriaNome: string | null;
  categoriaIcone: string | null;
};

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  await fecharFaturasVencidas(sessao.id);

  const params = req.nextUrl.searchParams;
  const tipo = params.get("tipo") || "transacoes";
  const de = params.get("de");
  const ate = params.get("ate");
  const busca = (params.get("busca") || "").trim().toLowerCase();

  if (!de || !ate) {
    return NextResponse.json({ error: "Informe o período (de/ate)." }, { status: 400 });
  }
  const inicio = new Date(`${de}T00:00:00`);
  const fim = new Date(`${ate}T23:59:59`);

  const itens: TransacaoItem[] = [];

  if (tipo !== "contratos") {
    const filtroTipo =
      tipo === "receitas" ? { tipo: "receita" as const } : tipo === "despesas" ? { tipo: "despesa" as const } : {};

    const lancamentos = await prisma.lancamento.findMany({
      where: { usuarioId: sessao.id, dataVencimento: { gte: inicio, lte: fim }, ...filtroTipo },
      include: { conta: true, categoria: true },
    });

    itens.push(
      ...lancamentos.map((l) => ({
        id: `lanc-${l.id}`,
        data: l.dataVencimento.toISOString(),
        descricao: l.descricao,
        valor: Number(l.status === "pago" ? l.valorPago ?? l.valor : l.valor),
        entrada: l.tipo === "receita",
        pago: l.status === "pago",
        contaNome: l.conta?.nome ?? null,
        contaIcone: l.conta?.icone ?? null,
        categoriaNome: l.categoria?.nome ?? null,
        categoriaIcone: l.categoria?.icone ?? null,
      }))
    );

    // Só entra em "Transações" (tudo) e "Despesas" — receita nunca é uma
    // compra no cartão (ver comentário no topo do arquivo).
    if (tipo === "transacoes" || tipo === "despesas") {
      const comprasCartao = await prisma.compraCartao.findMany({
        where: { usuarioId: sessao.id, dataCompra: { gte: inicio, lte: fim } },
        include: { cartao: true, categoria: true },
      });
      itens.push(
        ...comprasCartao.map((c) => ({
          id: `compra-cartao-${c.id}`,
          data: c.dataCompra.toISOString(),
          descricao: c.descricao,
          valor: Number(c.valor),
          entrada: false,
          // Uma compra no cartão só "vira dinheiro saindo de verdade" quando
          // a fatura fecha e é paga — até lá, não é um Lancamento pago.
          pago: false,
          contaNome: c.cartao.nome,
          contaIcone: c.cartao.icone,
          categoriaNome: c.categoria?.nome ?? null,
          categoriaIcone: c.categoria?.icone ?? null,
        }))
      );
    }
  }

  if (tipo === "contratos" || tipo === "transacoes") {
    const parcelas = await prisma.parcela.findMany({
      where: { contrato: { usuarioId: sessao.id }, vencimento: { gte: inicio, lte: fim } },
      include: { contrato: { include: { cliente: true } } },
    });
    itens.push(
      ...parcelas.map((p) => ({
        id: `parcela-${p.id}`,
        data: (p.status === "pago" ? p.pagoEm ?? p.vencimento : p.vencimento).toISOString(),
        descricao: `Parcela ${p.numero} · ${p.contrato.cliente.nome}`,
        valor: Number(p.status === "pago" ? p.valorPago ?? p.valor : p.valor),
        entrada: true,
        pago: p.status === "pago",
        contaNome: null,
        contaIcone: null,
        categoriaNome: "Empréstimo",
        categoriaIcone: "🤝",
      }))
    );
  }

  const filtrados = busca
    ? itens.filter((i) => {
        if (i.descricao.toLowerCase().includes(busca)) return true;
        const valorTexto = i.valor.toFixed(2).replace(".", ",");
        return valorTexto.includes(busca) || String(i.valor).includes(busca);
      })
    : itens;

  filtrados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return NextResponse.json(filtrados);
}
