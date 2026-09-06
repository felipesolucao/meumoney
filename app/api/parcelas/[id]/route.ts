// ============================================================================
// API: /api/parcelas/[id]
// PATCH -> ação sobre uma parcela:
//   { acao: "pagar" }                          -> marca como paga hoje
//   { acao: "reabrir" }                        -> desfaz um pagamento
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
  const { acao, novoVencimento, valor } = body as {
    acao: "pagar" | "reabrir" | "renegociar" | "editar";
    novoVencimento?: string;
    valor?: number;
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

  if (acao === "pagar") {
    await prisma.parcela.update({
      where: { id: params.id },
      data: { status: "pago", pagoEm: new Date(), valorPago: parcelaAtual.valor },
    });
    tipoHistorico = "PARCELA_PAGA";
    descricaoHistorico = `${numeroLabel} paga`;
  } else if (acao === "reabrir") {
    await prisma.parcela.update({
      where: { id: params.id },
      data: { status: "a_vencer", pagoEm: null, valorPago: null },
    });
    tipoHistorico = "PARCELA_REABERTA";
    descricaoHistorico = `${numeroLabel} reaberta (pagamento desfeito)`;
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
    valor: acao === "pagar" ? Number(parcelaAtual.valor) : acao === "reabrir" ? Number(parcelaAtual.valor) * -1 : null,
    dadosAntes: parcelaAtual,
    dadosDepois: parcelaAtualizada,
  });

  return NextResponse.json(parcelaAtualizada);
}
