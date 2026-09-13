// ============================================================================
// API: /api/financeiro/movimentacoes
// ----------------------------------------------------------------------------
// GET ?carteiraId=&limite=8 -> as últimas movimentações (receitas e despesas
// do financeiro, compras no cartão de crédito e parcelas de contratos
// pagas), juntas e ordenadas por data — o que alimenta "MOVIMENTAÇÕES
// RECENTES" na Início (ver components/MovimentacoesRecentesInicio.tsx).
//
// Sem carteiraId ("Geral"): mistura financeiro + contratos, igual sempre foi.
// Com carteiraId (uma carteira específica escolhida no seletor): só entram
// lançamentos do financeiro DESSA carteira — parcelas de contratos ficam de
// fora, porque contrato não pertence a uma carteira específica (é um módulo
// à parte, sempre "geral"). Sem essa distinção, trocar de carteira sempre
// mostraria as mesmas movimentações de contratos misturadas, vazando dado
// de fora da carteira selecionada — o bug relatado.
//
// NOVO: compras no cartão de crédito (CompraCartao) agora entram na lista
// também, pela data da COMPRA — antes só apareciam aqui (indiretamente, e
// sem detalhe algum) no dia em que a fatura inteira fechava e virava um
// único Lancamento pago. Cada item devolvido também traz "horario" (para
// mostrar hora:minuto, além da data — ver comentário no tipo Movimentacao),
// a forma de pagamento usada (conta/carteira ou qual cartão) e a categoria.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

type Movimentacao = {
  id: string;
  data: Date;
  // Carimbo de hora real do registro (Lancamento/CompraCartao guardam
  // "criadoEm" desde a criação; Parcela não tem esse campo — nesse caso usa
  // a própria data do pagamento, então a hora exibida cai em 00:00, o único
  // caso em que a hora não reflete o momento real da ação).
  horario: Date;
  descricao: string;
  valor: number;
  entrada: boolean;
  formaPagamentoNome: string | null;
  formaPagamentoIcone: string | null;
  categoriaNome: string | null;
  categoriaIcone: string | null;
};

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const carteiraId = params.get("carteiraId");
  const limite = Number(params.get("limite")) || 8;

  const filtroCarteira = carteiraId ? { conta: { carteiraId } } : {};
  const lancamentosPagos = await prisma.lancamento.findMany({
    where: { usuarioId: sessao.id, status: "pago", ...filtroCarteira },
    include: { conta: true, categoria: true },
    orderBy: { dataPagamento: "desc" },
    take: limite,
  });

  const movimentacoes: Movimentacao[] = lancamentosPagos.map((l) => ({
    id: `lanc-${l.id}`,
    data: l.dataPagamento ?? l.dataVencimento,
    horario: l.criadoEm,
    descricao: l.descricao,
    valor: Number(l.valorPago ?? l.valor),
    entrada: l.tipo === "receita",
    formaPagamentoNome: l.conta?.nome ?? null,
    formaPagamentoIcone: l.conta?.icone ?? null,
    categoriaNome: l.categoria?.nome ?? null,
    categoriaIcone: l.categoria?.icone ?? null,
  }));

  // NOVO: compras no cartão — sempre despesa ("entrada: false"), com a
  // forma de pagamento identificando o cartão usado (não a conta que só vai
  // pagar a fatura no futuro).
  const filtroCartaoCarteira = carteiraId ? { cartao: { conta: { carteiraId } } } : {};
  const comprasCartao = await prisma.compraCartao.findMany({
    where: { usuarioId: sessao.id, ...filtroCartaoCarteira },
    include: { cartao: true, categoria: true },
    orderBy: { dataCompra: "desc" },
    take: limite,
  });
  movimentacoes.push(
    ...comprasCartao.map((c) => ({
      id: `compra-cartao-${c.id}`,
      data: c.dataCompra,
      horario: c.criadoEm,
      descricao: c.descricao,
      valor: Number(c.valor),
      entrada: false,
      formaPagamentoNome: c.cartao.nome,
      formaPagamentoIcone: c.cartao.icone,
      categoriaNome: c.categoria?.nome ?? null,
      categoriaIcone: c.categoria?.icone ?? null,
    }))
  );

  // Contratos são um módulo à parte, sem carteira própria — só entram na
  // visão "Geral" (sem carteira escolhida).
  if (!carteiraId) {
    const parcelasPagas = await prisma.parcela.findMany({
      where: { contrato: { usuarioId: sessao.id }, status: "pago" },
      include: { contrato: { include: { cliente: true } }, conta: true },
      orderBy: { pagoEm: "desc" },
      take: limite,
    });
    movimentacoes.push(
      ...parcelasPagas
        .filter((p) => p.pagoEm)
        .map((p) => ({
          id: `parcela-${p.id}`,
          data: p.pagoEm as Date,
          horario: p.pagoEm as Date,
          descricao: `Parcela ${p.numero} · ${p.contrato.cliente.nome}`,
          valor: Number(p.valorPago ?? p.valor),
          entrada: true,
          formaPagamentoNome: p.conta?.nome ?? null,
          formaPagamentoIcone: p.conta?.icone ?? null,
          categoriaNome: null,
          categoriaIcone: null,
        }))
    );
  }

  movimentacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return NextResponse.json(movimentacoes.slice(0, limite));
}
