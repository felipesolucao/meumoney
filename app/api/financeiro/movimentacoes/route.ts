// ============================================================================
// API: /api/financeiro/movimentacoes
// ----------------------------------------------------------------------------
// GET ?carteiraId=&limite=8 -> as últimas movimentações pagas (receitas e
// despesas do financeiro + parcelas de contratos pagas), juntas e ordenadas
// por data — o que alimenta "MOVIMENTAÇÕES RECENTES" na Início (ver
// components/MovimentacoesRecentesInicio.tsx).
//
// Sem carteiraId ("Geral"): mistura financeiro + contratos, igual sempre foi.
// Com carteiraId (uma carteira específica escolhida no seletor): só entram
// lançamentos do financeiro DESSA carteira — parcelas de contratos ficam de
// fora, porque contrato não pertence a uma carteira específica (é um módulo
// à parte, sempre "geral"). Sem essa distinção, trocar de carteira sempre
// mostraria as mesmas movimentações de contratos misturadas, vazando dado
// de fora da carteira selecionada — o bug relatado.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

type Movimentacao = { id: string; data: Date; descricao: string; valor: number; entrada: boolean };

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const carteiraId = params.get("carteiraId");
  const limite = Number(params.get("limite")) || 8;

  const filtroCarteira = carteiraId ? { conta: { carteiraId } } : {};
  const lancamentosPagos = await prisma.lancamento.findMany({
    where: { usuarioId: sessao.id, status: "pago", ...filtroCarteira },
    orderBy: { dataPagamento: "desc" },
    take: limite,
  });

  const movimentacoes: Movimentacao[] = lancamentosPagos.map((l) => ({
    id: `lanc-${l.id}`,
    data: l.dataPagamento ?? l.dataVencimento,
    descricao: l.descricao,
    valor: Number(l.valorPago ?? l.valor),
    entrada: l.tipo === "receita",
  }));

  // Contratos são um módulo à parte, sem carteira própria — só entram na
  // visão "Geral" (sem carteira escolhida).
  if (!carteiraId) {
    const parcelasPagas = await prisma.parcela.findMany({
      where: { contrato: { usuarioId: sessao.id }, status: "pago" },
      include: { contrato: { include: { cliente: true } } },
      orderBy: { pagoEm: "desc" },
      take: limite,
    });
    movimentacoes.push(
      ...parcelasPagas
        .filter((p) => p.pagoEm)
        .map((p) => ({
          id: `parcela-${p.id}`,
          data: p.pagoEm as Date,
          descricao: `Parcela ${p.numero} · ${p.contrato.cliente.nome}`,
          valor: Number(p.valorPago ?? p.valor),
          entrada: true,
        }))
    );
  }

  movimentacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return NextResponse.json(movimentacoes.slice(0, limite));
}
