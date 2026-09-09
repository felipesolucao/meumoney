// ============================================================================
// API: /api/contratos/[id]
// GET    -> detalhe do contrato, com cliente e parcelas
// DELETE -> exclui o contrato (e parcelas, via cascade)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { registrarAcao } from "../../../../lib/historico";
import { calcularParcelasDoContrato, TipoEmprestimo, Frequencia } from "../../../../lib/calculos";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const contrato = await prisma.contrato.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { cliente: true, parcelas: { orderBy: { numero: "asc" } } },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  return NextResponse.json(contrato);
}

// PATCH -> edita o contrato. Dois modos, dependendo se alguma parcela já
// foi paga (ver app/contratos/[id]/editar/page.tsx, que decide qual usar):
//
//   - { jurosAtraso } sozinho -> edição leve de sempre (não mexe em parcela).
//
//   - Edição completa (nenhuma parcela paga ainda): body com os mesmos
//     campos de POST /api/contratos. Apaga TODAS as parcelas e recria do
//     zero com os novos valores/juros/parcelas/frequência/datas — seguro
//     porque nada foi pago ainda, não existe histórico de recebimento pra
//     perder.
//
//   - Edição parcial (já tem parcela paga): só numeroParcelas/frequencia/
//     dataPrimeiraParcela mudam. As parcelas PAGAS ficam intocadas; só as
//     que ainda não foram pagas são apagadas e recriadas, dividindo o saldo
//     restante (valorTotal - soma das pagas) pela nova quantidade de
//     parcelas restantes a partir da nova data. Valor/juros do contrato em
//     si ficam travados — mudar isso invalidaria as parcelas já recebidas.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.contrato.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { parcelas: { orderBy: { numero: "asc" } } },
  });
  if (!existente) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  const body = await req.json();

  // --- Edição leve (só jurosAtraso) — comportamento de sempre -------------
  if (Object.keys(body).length === 1 && "jurosAtraso" in body) {
    const contrato = await prisma.contrato.update({
      where: { id: params.id },
      data: { jurosAtraso: Boolean(body.jurosAtraso) },
    });
    await registrarAcao(prisma, {
      usuarioId: sessao.id,
      tipo: "CONTRATO_EDITADO",
      entidade: "Contrato",
      entidadeId: contrato.id,
      descricao: `Contrato editado - ${contrato.codigo}`,
      dadosAntes: existente,
      dadosDepois: contrato,
    });
    return NextResponse.json(contrato);
  }

  // --- Edição completa do formulário ---------------------------------------
  const {
    valorEmprestado,
    tipoEmprestimo,
    jurosAoMes,
    valorEntrada,
    dataEntrada,
    numeroParcelas,
    frequencia,
    dataPrimeiraParcela,
  } = body as {
    valorEmprestado?: number;
    tipoEmprestimo?: TipoEmprestimo;
    jurosAoMes?: number;
    valorEntrada?: number;
    dataEntrada?: string;
    numeroParcelas: number;
    frequencia: Frequencia;
    dataPrimeiraParcela: string;
  };

  if (!numeroParcelas || !frequencia || !dataPrimeiraParcela) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  const pagas = existente.parcelas.filter((p) => p.status === "pago");
  const naoPagas = existente.parcelas.filter((p) => p.status !== "pago");

  if (pagas.length > 0 && Number(numeroParcelas) < pagas.length) {
    return NextResponse.json({ error: `O contrato já tem ${pagas.length} parcela(s) paga(s) — não é possível ter menos parcelas que isso.` }, { status: 400 });
  }

  let novasParcelas: { numero: number; valor: number; vencimento: Date }[];
  let dadosContrato: Record<string, unknown>;

  if (pagas.length === 0) {
    // Nada pago ainda: recalcula tudo do zero, igual à criação.
    const entrada = Number(valorEntrada) || 0;
    if (entrada < 0 || entrada >= Number(valorEmprestado) || (entrada > 0 && Number(numeroParcelas) < 2)) {
      return NextResponse.json({ error: "A entrada deve ser menor que o valor do contrato e exige pelo menos 2 parcelas." }, { status: 400 });
    }
    const resultado = calcularParcelasDoContrato({
      valorContrato: Number(valorEmprestado),
      valorEntrada: entrada,
      numeroParcelas: Number(numeroParcelas),
      frequencia,
      dataEntrada: entrada && dataEntrada ? new Date(dataEntrada) : undefined,
      dataPrimeiraParcela: new Date(dataPrimeiraParcela),
    });
    novasParcelas = resultado.parcelas;
    dadosContrato = {
      valorEmprestado: Number(valorEmprestado),
      tipoEmprestimo,
      jurosAoMes: Number(jurosAoMes) || 0,
      valorEntrada: entrada,
      dataEntrada: entrada && dataEntrada ? new Date(dataEntrada) : null,
      numeroParcelas: Number(numeroParcelas),
      frequencia,
      dataPrimeiraParcela: new Date(dataPrimeiraParcela),
      valorTotal: Number(valorEmprestado),
    };
  } else {
    // Já tem parcela paga: só recalcula a "cauda" (as que ainda não foram
    // pagas), dividindo o que falta pela nova quantidade de parcelas
    // restantes. Valor/juros do contrato ficam como estavam.
    const quantidadeRestante = Number(numeroParcelas) - pagas.length;
    if (quantidadeRestante === 0) {
      novasParcelas = [];
    } else {
      const valorPagoTotal = pagas.reduce((s, p) => s + Number(p.valor), 0);
      const valorRestante = Number(existente.valorTotal) - valorPagoTotal;
      const resultado = calcularParcelasDoContrato({
        valorContrato: valorRestante,
        valorEntrada: 0,
        numeroParcelas: quantidadeRestante,
        frequencia,
        dataPrimeiraParcela: new Date(dataPrimeiraParcela),
      });
      novasParcelas = resultado.parcelas.map((p, indice) => ({ ...p, numero: pagas.length + indice + 1 }));
    }
    dadosContrato = {
      numeroParcelas: Number(numeroParcelas),
      frequencia,
    };
  }

  const [, contrato] = await prisma.$transaction([
    prisma.parcela.deleteMany({ where: { id: { in: naoPagas.map((p) => p.id) } } }),
    prisma.contrato.update({
      where: { id: params.id },
      data: {
        ...dadosContrato,
        status: novasParcelas.length === 0 ? "quitado" : "em_dia",
        parcelas: { create: novasParcelas.map((p) => ({ numero: p.numero, valor: p.valor, vencimento: p.vencimento, status: "a_vencer" })) },
      },
      include: { parcelas: { orderBy: { numero: "asc" } }, cliente: true },
    }),
  ]);

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "CONTRATO_EDITADO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    descricao: `Contrato editado - ${contrato.codigo} (parcelas recalculadas)`,
    dadosAntes: existente,
    dadosDepois: contrato,
  });

  return NextResponse.json(contrato);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.contrato.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { cliente: true },
  });
  if (!existente) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  // O desconto/devolução na conta bancária (ver Contrato.contaDesembolsoId)
  // não é um Lancamento — é calculado na hora a partir do próprio contrato
  // (ver app/api/financeiro/contas-resumo/route.ts) — então excluir o
  // contrato já tira o valor do saldo da conta sozinho, sem nada extra
  // pra limpar aqui.
  await prisma.contrato.delete({ where: { id: params.id } });

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "CONTRATO_EXCLUIDO",
    entidade: "Contrato",
    entidadeId: existente.id,
    descricao: `Contrato excluído - ${existente.codigo} (${existente.cliente.nome})`,
    dadosAntes: existente,
    // Nota: as parcelas do contrato são apagadas em cascata; reverter recria
    // o contrato mas não as parcelas individuais — aviso explícito no botão.
  });

  return NextResponse.json({ ok: true });
}
