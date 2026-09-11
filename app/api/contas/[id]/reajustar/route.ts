import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { registrarAcao } from "../../../../../lib/historico";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const valido = (valor: unknown): valor is number => typeof valor === "number" && Number.isFinite(valor) && Math.abs(valor) <= 9999999999.99;
  if (!valido(body?.novoSaldo) || !valido(body?.saldoEsperado) || !["transacao", "inicial"].includes(body?.modo)) {
    return NextResponse.json({ error: "Informe um saldo e uma opção de ajuste válidos." }, { status: 400 });
  }
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const conta = await tx.conta.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
      if (!conta) return { error: "Conta não encontrada.", status: 404 };
      const pagos = await tx.lancamento.findMany({ where: { contaId: conta.id, usuarioId: sessao.id, status: "pago" } });
      let saldo = pagos.reduce((total, l) => total.plus(new Prisma.Decimal(l.valorPago ?? l.valor).times(l.tipo === "receita" ? 1 : -1)), new Prisma.Decimal(conta.saldoInicial));
      // O saldo da conta também inclui desembolsos e parcelas de empréstimos.
      const contratos = await tx.contrato.findMany({
        where: { usuarioId: sessao.id },
        select: { contaDesembolsoId: true, valorEmprestado: true, parcelas: { select: { status: true, contaId: true, valorPago: true, valor: true } } },
      });
      for (const contrato of contratos) {
        if (contrato.contaDesembolsoId === conta.id) saldo = saldo.minus(contrato.valorEmprestado);
        for (const parcela of contrato.parcelas) {
          if (parcela.status === "pago" && (parcela.contaId ?? contrato.contaDesembolsoId) === conta.id) {
            saldo = saldo.plus(parcela.valorPago ?? parcela.valor);
          }
        }
      }
      const novo = new Prisma.Decimal(body.novoSaldo).toDecimalPlaces(2);
      if (saldo.equals(novo)) return { ok: true };
      if (!saldo.equals(new Prisma.Decimal(body.saldoEsperado).toDecimalPlaces(2))) return { error: "O saldo mudou. Feche o popup e atualize as contas antes de reajustar.", status: 409 };
      const delta = novo.minus(saldo);
      if (body.modo === "inicial") {
        const inicial = new Prisma.Decimal(conta.saldoInicial).plus(delta);
        if (inicial.abs().greaterThan("9999999999.99")) return { error: "O ajuste excede o saldo permitido.", status: 400 };
        await tx.conta.update({ where: { id: conta.id }, data: { saldoInicial: inicial } });
      } else {
        if (delta.abs().greaterThan("9999999999.99")) return { error: "O ajuste excede o valor permitido.", status: 400 };
        const agora = new Date();
        const lancamento = await tx.lancamento.create({ data: {
          descricao: `Reajuste — ${conta.nome}`, valor: delta.abs(), valorPago: delta.abs(),
          tipo: delta.isPositive() ? "receita" : "despesa", status: "pago",
          dataVencimento: agora, dataPagamento: agora, contaId: conta.id, usuarioId: sessao.id,
        } });
        await registrarAcao(tx, { usuarioId: sessao.id, tipo: "LANCAMENTO_CRIADO", entidade: "Lancamento", entidadeId: lancamento.id,
          descricao: lancamento.descricao, valor: delta.toNumber(), dadosDepois: lancamento });
      }
      return { ok: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(resultado, { status: "status" in resultado ? resultado.status : 200 });
  } catch (error) {
    const conflito = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
    return NextResponse.json({ error: conflito ? "O saldo foi alterado. Atualize e tente novamente." : "Não foi possível reajustar o saldo. Tente novamente." }, { status: conflito ? 409 : 500 });
  }
}
