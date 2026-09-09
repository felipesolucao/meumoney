// ============================================================================
// API: /api/parcelas/[id]
// PATCH -> ação sobre uma parcela:
//   { acao: "pagar", dataRecebimento?, valorRecebido? } -> registra um
//     recebimento (ver ReceberPagamentoModal). Sem valorRecebido, recebe o
//     restante todo. Se o total recebido (somando recebimentos anteriores)
//     ainda ficar abaixo do valor da parcela, ela vira "pagamento parcial"
//     (mesmo status a_vencer/atrasado, só que com valorPago > 0) em vez de
//     "pago" — só fecha quando o total recebido bate o valor.
//   { acao: "reabrir" }                        -> desfaz o pagamento (zera
//     valorPago por completo, mesmo que tenha sido parcial)
//   { acao: "renegociar", novoVencimento }     -> altera a data de vencimento
//   { acao: "editar", valor?, novoVencimento? } -> edita valor e/ou vencimento
// Depois de qualquer alteração, recalcula o status geral do contrato e
// registra a ação no histórico (para permitir reverter depois).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { registrarAcao } from "../../../../lib/historico";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { acao, novoVencimento, valor, dataRecebimento, valorRecebido } = body as {
    acao: "pagar" | "reabrir" | "renegociar" | "editar";
    novoVencimento?: string;
    valor?: number;
    dataRecebimento?: string;
    valorRecebido?: number;
  };

  // A parcela só pode ser alterada se o contrato dela pertencer ao usuário logado.
  const parcelaAtual = await prisma.parcela.findFirst({
    where: { id: params.id, contrato: { usuarioId: sessao.id } },
    include: { contrato: { include: { cliente: true } } },
  });
  if (!parcelaAtual) {
    return NextResponse.json({ error: "Parcela não encontrada." }, { status: 404 });
  }

  const numeroLabel = `Parcela ${parcelaAtual.numero} do contrato ${parcelaAtual.contrato.codigo}`;
  let tipoHistorico = "";
  let descricaoHistorico = "";
  let valorHistorico: number | null = null;

  if (acao === "pagar") {
    const valorTotal = Number(parcelaAtual.valor);
    const jaRecebido = Number(parcelaAtual.valorPago ?? 0);
    // Sem valorRecebido informado, assume que recebeu o que ainda falta
    // (comportamento antigo: marcar como paga direto).
    const recebidoAgora = valorRecebido !== undefined ? Number(valorRecebido) : valorTotal - jaRecebido;
    const novoValorPago = jaRecebido + recebidoAgora;
    const dataPagamento = dataRecebimento ? new Date(dataRecebimento) : new Date();
    const quitada = novoValorPago >= valorTotal;

    await prisma.parcela.update({
      where: { id: params.id },
      data: quitada
        ? { status: "pago", pagoEm: dataPagamento, valorPago: novoValorPago }
        // Pagamento parcial: continua a_vencer/atrasado (recalculado abaixo
        // pelo bloco de status do contrato), só acumula o valor recebido.
        : { valorPago: novoValorPago },
    });

    // Se o contrato tem uma conta de desembolso vinculada (ver
    // Contrato.contaDesembolsoId), o valor "volta" pro saldo dessa conta só
    // por conta do valorPago da parcela subir — o cálculo em
    // app/api/financeiro/contas-resumo/route.ts já soma isso de volta. De
    // propósito NÃO cria um Lancamento receita: esse retorno não é uma
    // "conta a receber" do financeiro do dia a dia.
    tipoHistorico = quitada ? "PARCELA_PAGA" : "PARCELA_PAGAMENTO_PARCIAL";
    descricaoHistorico = quitada ? `${numeroLabel} paga` : `${numeroLabel} recebeu pagamento parcial`;
    valorHistorico = recebidoAgora;
  } else if (acao === "reabrir") {
    await prisma.parcela.update({
      where: { id: params.id },
      data: { status: "a_vencer", pagoEm: null, valorPago: null },
    });
    tipoHistorico = "PARCELA_REABERTA";
    descricaoHistorico = `${numeroLabel} reaberta (pagamento desfeito)`;
    valorHistorico = Number(parcelaAtual.valorPago ?? parcelaAtual.valor) * -1;
  } else if (acao === "renegociar") {
    if (!novoVencimento) {
      return NextResponse.json({ error: "Informe a nova data de vencimento." }, { status: 400 });
    }
    await prisma.parcela.update({
      where: { id: params.id },
      data: { vencimento: new Date(novoVencimento), status: "a_vencer" },
    });
    tipoHistorico = "PARCELA_RENEGOCIADA";
    descricaoHistorico = `${numeroLabel} renegociada`;
  } else if (acao === "editar") {
    await prisma.parcela.update({
      where: { id: params.id },
      data: {
        ...(valor !== undefined ? { valor: Number(valor) } : {}),
        ...(novoVencimento !== undefined ? { vencimento: new Date(novoVencimento) } : {}),
      },
    });
    tipoHistorico = "PARCELA_EDITADA";
    descricaoHistorico = `${numeroLabel} editada`;
  } else {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  // --- Recalcula o status geral do contrato -------------------------------
  const parcelas = await prisma.parcela.findMany({ where: { contratoId: parcelaAtual.contratoId } });
  const hoje = new Date(new Date().toDateString());

  const todasPagas = parcelas.every((p) => p.status === "pago");
  const algumaAtrasada = parcelas.some((p) => p.status !== "pago" && new Date(p.vencimento) < hoje);

  const novoStatus = todasPagas ? "quitado" : algumaAtrasada ? "atrasado" : "em_dia";

  await prisma.contrato.update({
    where: { id: parcelaAtual.contratoId },
    data: { status: novoStatus },
  });

  const parcelaAtualizada = await prisma.parcela.findUnique({ where: { id: params.id } });

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: tipoHistorico,
    entidade: "Parcela",
    entidadeId: params.id,
    descricao: descricaoHistorico,
    valor: valorHistorico,
    dadosAntes: parcelaAtual,
    dadosDepois: parcelaAtualizada,
  });

  return NextResponse.json(parcelaAtualizada);
}
