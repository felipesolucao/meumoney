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
import { obterSessao } from "../../../../lib/auth";
import { registrarAcao } from "../../../../lib/historico";

import { transacaoNegociacao, ErroNegociacaoFunil } from "../../../../lib/negociacoesFunil";
import { atualizarStatusContrato } from "../../../../lib/contratosNegociacoes";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { acao, novoVencimento, valor, dataRecebimento, valorRecebido, contaId, valorPagoEsperado } = body as {
    acao: "pagar" | "reabrir" | "renegociar" | "editar";
    novoVencimento?: string;
    valor?: number;
    dataRecebimento?: string;
    valorRecebido?: number;
    contaId?: string;
    valorPagoEsperado?: number;
  };

  try {
    return await transacaoNegociacao(async tx => {
      // A parcela só pode ser alterada se o contrato dela pertencer ao usuário logado.
      const parcelaAtual = await tx.parcela.findFirst({
        where: { id: params.id, contrato: { usuarioId: sessao.id } },
        include: { contrato: { include: { cliente: true } } },
      });
      if (!parcelaAtual) {
        return NextResponse.json({ error: "Parcela não encontrada." }, { status: 404 });
      }

      if (valorPagoEsperado !== undefined && Math.round(Number(parcelaAtual.valorPago ?? 0) * 100) !== Math.round(valorPagoEsperado * 100)) {
        return NextResponse.json({ error: "A parcela foi alterada em outra tela. Atualize a lista antes de continuar." }, { status: 409 });
      }
      const numeroLabel = `Parcela ${parcelaAtual.numero} do contrato ${parcelaAtual.contrato.codigo}`;
      let tipoHistorico = "";
      let descricaoHistorico = "";
      let valorHistorico: number | null = null;

      if (acao === "pagar") {
        const valorTotal = Number(parcelaAtual.valor);
        const jaRecebido = Number(parcelaAtual.valorPago ?? (parcelaAtual.status === "pago" ? parcelaAtual.valor : 0));
        // Sem valorRecebido informado, assume que recebeu o que ainda falta
        // (comportamento antigo: marcar como paga direto).
        const recebidoAgora = valorRecebido !== undefined ? Number(valorRecebido) : valorTotal - jaRecebido;
        if (!Number.isFinite(recebidoAgora) || recebidoAgora <= 0 || Math.round(recebidoAgora * 100) > Math.round((valorTotal - jaRecebido) * 100)) {
          return NextResponse.json({ error: "Informe um valor positivo até o saldo restante. Atualize a lista se a parcela já foi paga." }, { status: 409 });
        }
        if (contaId && !await tx.conta.findFirst({ where: { id: contaId, usuarioId: sessao.id } })) {
          return NextResponse.json({ error: "Conta bancária não encontrada." }, { status: 400 });
        }
        const novoValorPago = Math.round((jaRecebido + recebidoAgora) * 100) / 100;
        const dataPagamento = dataRecebimento ? new Date(dataRecebimento) : new Date();
        if (!Number.isFinite(dataPagamento.getTime()) || dataPagamento > new Date()) {
          return NextResponse.json({ error: "Data de recebimento inválida." }, { status: 400 });
        }
        const quitada = novoValorPago >= valorTotal;

        await tx.parcela.update({
          where: { id: params.id },
          data: quitada
            ? { status: "pago", pagoEm: dataPagamento, valorPago: novoValorPago, ...(contaId ? { contaId } : {}) }
            // Pagamento parcial: continua a_vencer/atrasado (recalculado abaixo
            // pelo bloco de status do contrato), só acumula o valor recebido.
            : { valorPago: novoValorPago, pagoEm: dataPagamento, ...(contaId ? { contaId } : {}) },
        });

        // A conta escolhida no popup (Parcela.contaId, ver ReceberPagamentoModal)
        // recebe o valor de volta no saldo — sem escolha explícita, cai na conta
        // de desembolso do contrato (Contrato.contaDesembolsoId), se houver — o
        // cálculo em app/api/financeiro/contas-resumo/route.ts já soma isso. De
        // propósito NÃO cria um Lancamento receita: esse retorno não é uma
        // "conta a receber" do financeiro do dia a dia.
        tipoHistorico = quitada ? "PARCELA_PAGA" : "PARCELA_PAGAMENTO_PARCIAL";
        descricaoHistorico = quitada ? `${numeroLabel} paga` : `${numeroLabel} recebeu pagamento parcial`;
        valorHistorico = recebidoAgora;
      } else if (acao === "reabrir") {
        await tx.parcela.update({
          where: { id: params.id },
          data: { status: "a_vencer", pagoEm: null, valorPago: null },
        });
        tipoHistorico = "PARCELA_REABERTA";
        descricaoHistorico = `${numeroLabel} reaberta (pagamento desfeito)`;
        valorHistorico = Number(parcelaAtual.valorPago ?? parcelaAtual.valor) * -1;
      } else if (acao === "renegociar") {
        if (!novoVencimento || !Number.isFinite(new Date(novoVencimento).getTime())) {
          return NextResponse.json({ error: "Informe a nova data de vencimento." }, { status: 400 });
        }
        await tx.parcela.update({
          where: { id: params.id },
          data: { vencimento: new Date(novoVencimento), status: "a_vencer" },
        });
        tipoHistorico = "PARCELA_RENEGOCIADA";
        descricaoHistorico = `${numeroLabel} renegociada`;
      } else if (acao === "editar") {
        if ((valor !== undefined && (!Number.isFinite(Number(valor)) || Number(valor) <= 0 || Number(valor) < Number(parcelaAtual.valorPago ?? 0))) || (novoVencimento !== undefined && !Number.isFinite(new Date(novoVencimento).getTime()))) {
          return NextResponse.json({ error: "Valor ou vencimento inválido. O valor não pode ser menor que o já recebido." }, { status: 400 });
        }
        await tx.parcela.update({
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

      await atualizarStatusContrato(tx, sessao.id, parcelaAtual.contratoId);

      const parcelaAtualizada = await tx.parcela.findUnique({ where: { id: params.id } });

      await registrarAcao(tx, {
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
    });
  } catch (e) {
    if (e instanceof ErroNegociacaoFunil) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
