import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { registrarAcao } from "../../../../lib/historico";

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const valorInformado = body?.valor;
  if (!body?.contaOrigemId || !body?.contaDestinoId || body.contaOrigemId === body.contaDestinoId) {
    return NextResponse.json({ error: "Escolha contas de origem e destino diferentes." }, { status: 400 });
  }
  if (typeof valorInformado !== "number" || !Number.isFinite(valorInformado) || valorInformado <= 0 || valorInformado > 9999999999.99) {
    return NextResponse.json({ error: "Informe um valor de transferência válido." }, { status: 400 });
  }
  if (typeof body.criarHistorico !== "boolean") {
    return NextResponse.json({ error: "Informe se deseja criar o histórico da movimentação." }, { status: 400 });
  }

  try {
    const valor = new Prisma.Decimal(valorInformado).toDecimalPlaces(2);
    await prisma.$transaction(async (tx) => {
      const contas = await tx.conta.findMany({
        where: { id: { in: [body.contaOrigemId, body.contaDestinoId] }, usuarioId: sessao.id },
      });
      if (contas.length !== 2) throw new Error("CONTA_NAO_ENCONTRADA");
      const origem = contas.find((conta) => conta.id === body.contaOrigemId);
      const destino = contas.find((conta) => conta.id === body.contaDestinoId);
      if (!origem || !destino) throw new Error("CONTA_NAO_ENCONTRADA");

      if (!body.criarHistorico) {
        await tx.conta.update({ where: { id: origem.id }, data: { saldoInicial: { decrement: valor } } });
        await tx.conta.update({ where: { id: destino.id }, data: { saldoInicial: { increment: valor } } });
        return;
      }

      const agora = new Date();
      const descricao = `Transferência: ${origem.nome} → ${destino.nome}`;
      const [saida, entrada] = await Promise.all([
        tx.lancamento.create({ data: { descricao, valor, valorPago: valor, tipo: "despesa", status: "pago", dataVencimento: agora, dataPagamento: agora, contaId: origem.id, usuarioId: sessao.id } }),
        tx.lancamento.create({ data: { descricao, valor, valorPago: valor, tipo: "receita", status: "pago", dataVencimento: agora, dataPagamento: agora, contaId: destino.id, usuarioId: sessao.id } }),
      ]);
      await registrarAcao(tx, { usuarioId: sessao.id, tipo: "LANCAMENTO_CRIADO", entidade: "Lancamento", entidadeId: saida.id, descricao, valor: -valor.toNumber(), dadosDepois: saida });
      await registrarAcao(tx, { usuarioId: sessao.id, tipo: "LANCAMENTO_CRIADO", entidade: "Lancamento", entidadeId: entrada.id, descricao, valor: valor.toNumber(), dadosDepois: entrada });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTA_NAO_ENCONTRADA") {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Não foi possível concluir a transferência." }, { status: 500 });
  }
}
