import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/prisma";
import { obterSessao } from "../../../../../../lib/auth";
import { registrarAcao } from "../../../../../../lib/historico";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; faturaId: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.acao !== "pagar" && body?.acao !== "reabrir") {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const fatura = await tx.faturaCartao.findFirst({
        where: { id: params.faturaId, cartaoId: params.id, cartao: { usuarioId: sessao.id } },
        include: { cartao: true },
      });
      if (!fatura) return { error: "Fatura não encontrada.", status: 404 };
      if (fatura.status === "aberta") return { error: "Aguarde o fechamento da fatura para pagar.", status: 400 };
      const pagar = body.acao === "pagar";
      if (fatura.status === (pagar ? "paga" : "fechada")) return { ok: true };
      let lancamentoId = fatura.lancamentoId;
      // Faturas vazias e faturas cujo lançamento foi excluído também podem ser quitadas.
      if (!lancamentoId && Number(fatura.valorTotal) > 0 && pagar) {
        const criado = await tx.lancamento.create({ data: {
          descricao: `Fatura ${fatura.cartao.nome} — ${fatura.mesReferencia + 1}/${fatura.anoReferencia}`,
          valor: fatura.valorTotal, tipo: "despesa", origem: fatura.cartao.origem,
          status: "pendente", dataVencimento: fatura.dataVencimento,
          contaId: fatura.cartao.contaId, usuarioId: sessao.id,
        } });
        lancamentoId = criado.id;
      }
      if (lancamentoId) {
        const antes = await tx.lancamento.findFirst({ where: { id: lancamentoId, usuarioId: sessao.id } });
        if (!antes) throw new Error("Lançamento da fatura indisponível.");
        const depois = await tx.lancamento.update({ where: { id: lancamentoId }, data: {
          status: pagar ? "pago" : "pendente", dataPagamento: pagar ? new Date() : null,
          valorPago: pagar ? antes.valor : null,
        } });
        await registrarAcao(tx, {
          usuarioId: sessao.id, tipo: pagar ? "LANCAMENTO_PAGO" : "LANCAMENTO_REABERTO",
          entidade: "Lancamento", entidadeId: lancamentoId,
          descricao: `${pagar ? "Pago" : "Reaberto"}: ${antes.descricao}`,
          valor: Number(antes.valor) * (pagar ? -1 : 1), dadosAntes: antes, dadosDepois: depois,
        });
      }
      await tx.faturaCartao.update({ where: { id: fatura.id }, data: { status: pagar ? "paga" : "fechada", lancamentoId } });
      return { ok: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(resultado, { status: "status" in resultado ? resultado.status : 200 });
  } catch (error) {
    const conflito = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
    return NextResponse.json({ error: conflito ? "A fatura foi alterada. Atualize e tente novamente." : "Não foi possível atualizar a fatura. Tente novamente." }, { status: conflito ? 409 : 500 });
  }
}
