// ============================================================================
// API: /api/contas/[id]/extrato?de=aaaa-mm-dd&ate=aaaa-mm-dd
// ----------------------------------------------------------------------------
// GET -> detalhe de uma conta bancária (saldo atual, igual ao cálculo de
// /api/financeiro/contas-resumo) + o histórico de movimentações dela no
// período pedido — mesmo padrão da tela de extrato do cartão de crédito
// (app/financeiro/cartoes/[id]), só que aqui reúne três origens diferentes
// num único extrato ordenado por data:
//   - Lançamentos (receita/despesa) pagos nesta conta
//   - Empréstimos desembolsados a partir desta conta (Contrato.
//     contaDesembolsoId) — saída na data de criação do contrato
//   - Parcelas de contrato pagas que devolveram o valor pra esta conta
//     (Parcela.contaId, com fallback pra Contrato.contaDesembolsoId em
//     pagamentos antigos sem conta escolhida) — entrada na data do pagamento
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";

type Movimento = {
  id: string;
  tipo: "receita" | "despesa" | "emprestimo_saida" | "emprestimo_entrada";
  descricao: string;
  subtitulo: string | null;
  valor: number;
  data: string;
  icone: string;
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const conta = await prisma.conta.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!conta) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const deStr = req.nextUrl.searchParams.get("de");
  const ateStr = req.nextUrl.searchParams.get("ate");
  const de = deStr ? new Date(`${deStr}T00:00:00`) : null;
  const ate = ateStr ? new Date(`${ateStr}T23:59:59`) : null;
  const filtroData = de && ate ? { gte: de, lte: ate } : undefined;

  // --- Saldo atual (mesmo cálculo de /api/financeiro/contas-resumo, sem o
  // filtro de período — o saldo é sempre o corrente, não o do período) -----
  const [todosLancamentosPagos, todosContratos] = await Promise.all([
    prisma.lancamento.findMany({
      where: { usuarioId: sessao.id, status: "pago", contaId: conta.id },
      select: { tipo: true, valorPago: true, valor: true },
    }),
    // BUGFIX: antes filtrava contratos por contaDesembolsoId=conta.id, o que
    // deixava de fora parcelas com uma conta de destino escolhida (Parcela.
    // contaId) diferente da conta de desembolso do contrato (ou de contratos
    // sem conta de desembolso nenhuma) — busca todos os contratos do usuário
    // e decide dentro do loop o que entra no saldo desta conta.
    prisma.contrato.findMany({
      where: { usuarioId: sessao.id },
      select: { contaDesembolsoId: true, valorEmprestado: true, parcelas: { select: { status: true, valor: true, valorPago: true, contaId: true } } },
    }),
  ]);

  let saldoAtual = Number(conta.saldoInicial);
  for (const l of todosLancamentosPagos) {
    const valor = Number(l.valorPago ?? l.valor);
    saldoAtual += l.tipo === "receita" ? valor : -valor;
  }
  for (const c of todosContratos) {
    if (c.contaDesembolsoId === conta.id) saldoAtual -= Number(c.valorEmprestado);
    for (const p of c.parcelas) {
      if (p.status !== "pago") continue;
      const contaDestino = p.contaId ?? c.contaDesembolsoId;
      if (contaDestino !== conta.id) continue;
      saldoAtual += Number(p.valorPago ?? p.valor);
    }
  }

  // --- Movimentações do período pedido --------------------------------------
  const [lancamentos, contratosDesembolsados, parcelasRecebidas] = await Promise.all([
    prisma.lancamento.findMany({
      where: { usuarioId: sessao.id, contaId: conta.id, status: "pago", ...(filtroData ? { dataPagamento: filtroData } : {}) },
      include: { categoria: { select: { nome: true, icone: true } } },
      orderBy: { dataPagamento: "desc" },
    }),
    prisma.contrato.findMany({
      where: { usuarioId: sessao.id, contaDesembolsoId: conta.id, ...(filtroData ? { criadoEm: filtroData } : {}) },
      include: { cliente: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.parcela.findMany({
      where: {
        status: "pago",
        ...(filtroData ? { pagoEm: filtroData } : {}),
        contrato: { usuarioId: sessao.id },
        OR: [{ contaId: conta.id }, { AND: [{ contaId: null }, { contrato: { contaDesembolsoId: conta.id } }] }],
      },
      include: { contrato: { include: { cliente: { select: { nome: true } } } } },
      orderBy: { pagoEm: "desc" },
    }),
  ]);

  const movimentos: Movimento[] = [
    ...lancamentos.map((l) => ({
      id: `lancamento-${l.id}`,
      tipo: l.tipo,
      descricao: l.descricao,
      subtitulo: l.categoria?.nome ?? null,
      valor: Number(l.valorPago ?? l.valor),
      data: (l.dataPagamento ?? l.dataVencimento).toISOString(),
      icone: l.categoria?.icone ?? (l.tipo === "receita" ? "💰" : "🧾"),
    })),
    ...contratosDesembolsados.map((c) => ({
      id: `desembolso-${c.id}`,
      tipo: "emprestimo_saida" as const,
      descricao: `Empréstimo concedido · ${c.cliente.nome}`,
      subtitulo: `Contrato ${c.codigo}`,
      valor: Number(c.valorEmprestado),
      data: c.criadoEm.toISOString(),
      icone: "🤝",
    })),
    ...parcelasRecebidas.map((p) => ({
      id: `parcela-${p.id}`,
      tipo: "emprestimo_entrada" as const,
      descricao: `Parcela ${p.numero} recebida · ${p.contrato.cliente.nome}`,
      subtitulo: `Contrato ${p.contrato.codigo}`,
      valor: Number(p.valorPago ?? p.valor),
      data: (p.pagoEm ?? p.vencimento).toISOString(),
      icone: "🤝",
    })),
  ].sort((a, b) => b.data.localeCompare(a.data));

  const totalEntradas = movimentos
    .filter((m) => m.tipo === "receita" || m.tipo === "emprestimo_entrada")
    .reduce((s, m) => s + m.valor, 0);
  const totalSaidas = movimentos
    .filter((m) => m.tipo === "despesa" || m.tipo === "emprestimo_saida")
    .reduce((s, m) => s + m.valor, 0);

  return NextResponse.json({
    conta: { id: conta.id, nome: conta.nome, icone: conta.icone, saldoAtual },
    movimentos,
    totalEntradas,
    totalSaidas,
  });
}
