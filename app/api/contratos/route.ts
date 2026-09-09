// ============================================================================
// API: /api/contratos
// GET  -> lista os contratos DO USUÁRIO LOGADO, com cliente e parcelas
// POST -> cria um novo contrato + gera automaticamente todas as parcelas
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";
import { calcularParcelasDoContrato, gerarCodigoContrato, TipoEmprestimo, Frequencia } from "../../../lib/calculos";
import { registrarAcao } from "../../../lib/historico";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const contratos = await prisma.contrato.findMany({
    where: { usuarioId: sessao.id },
    orderBy: { criadoEm: "desc" },
    include: { cliente: true, parcelas: { orderBy: { numero: "asc" } } },
  });
  return NextResponse.json(contratos);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const {
    clienteId,
    valorEmprestado,
    tipoEmprestimo,
    jurosAoMes,
    jurosAtraso,
    tipoJurosAtraso,
    valorJurosAtraso,
    frequenciaJurosAtraso,
    multaAtraso,
    tipoMultaAtraso,
    valorMultaAtraso,
    valorEntrada,
    dataEntrada,
    numeroParcelas,
    frequencia,
    dataPrimeiraParcela,
    contaDesembolsoId,
  } = body as {
    clienteId: string;
    valorEmprestado: number;
    tipoEmprestimo: TipoEmprestimo;
    jurosAoMes: number;
    jurosAtraso: boolean;
    tipoJurosAtraso?: "fixo" | "percentual";
    valorJurosAtraso?: number;
    frequenciaJurosAtraso?: "diaria" | "semanal" | "mensal";
    multaAtraso?: boolean;
    tipoMultaAtraso?: "fixa" | "percentual";
    valorMultaAtraso?: number;
    valorEntrada?: number;
    dataEntrada?: string;
    numeroParcelas: number;
    frequencia: Frequencia;
    dataPrimeiraParcela: string;
    // Conta bancária de onde o valor emprestado é descontado na hora (NOVO)
    // — ver app/contratos/novo/page.tsx e o bloco "Desconta da conta" abaixo.
    contaDesembolsoId?: string;
  };

  // --- Validação básica dos campos obrigatórios --------------------------
  if (!clienteId || !valorEmprestado || !numeroParcelas || !frequencia || !dataPrimeiraParcela) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }
  const entrada = Number(valorEntrada) || 0;
  const jurosPorAtraso = Number(valorJurosAtraso) || 0;
  const multa = Number(valorMultaAtraso) || 0;
  if (entrada < 0 || entrada >= Number(valorEmprestado) || (entrada > 0 && Number(numeroParcelas) < 2)) {
    return NextResponse.json({ error: "A entrada deve ser menor que o valor do contrato e exige pelo menos 2 parcelas." }, { status: 400 });
  }
  if (multaAtraso && (!tipoMultaAtraso || multa <= 0 || (tipoMultaAtraso === "percentual" && multa > 100))) {
    return NextResponse.json({ error: "Informe uma multa por atraso válida." }, { status: 400 });
  }
  if (jurosAtraso && (!tipoJurosAtraso || !frequenciaJurosAtraso || !Number.isFinite(jurosPorAtraso) || jurosPorAtraso <= 0 || (tipoJurosAtraso === "percentual" && jurosPorAtraso > 100))) {
    return NextResponse.json({ error: "Informe os juros por atraso e sua frequência." }, { status: 400 });
  }

  // O cliente precisa existir E pertencer ao usuário logado.
  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, usuarioId: sessao.id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  // Idem para a conta de desembolso, se escolhida — só pode debitar de uma
  // conta que realmente pertence a este usuário.
  if (contaDesembolsoId) {
    const conta = await prisma.conta.findFirst({ where: { id: contaDesembolsoId, usuarioId: sessao.id } });
    if (!conta) {
      return NextResponse.json({ error: "Conta bancária não encontrada." }, { status: 404 });
    }
  }

  // O valor informado é o total da negociação. A entrada entra como a 1ª
  // parcela e o saldo é dividido entre as parcelas restantes.
  const resultado = calcularParcelasDoContrato({
    valorContrato: Number(valorEmprestado),
    valorEntrada: entrada,
    numeroParcelas: Number(numeroParcelas),
    frequencia,
    dataEntrada: entrada && dataEntrada ? new Date(dataEntrada) : undefined,
    dataPrimeiraParcela: new Date(dataPrimeiraParcela),
  });

  // --- Gera um código único para o contrato (tenta até não colidir) -------
  let codigo = gerarCodigoContrato();
  while (await prisma.contrato.findUnique({ where: { codigo } })) {
    codigo = gerarCodigoContrato();
  }

  let contrato = await prisma.contrato.create({
    data: {
      codigo,
      clienteId,
      usuarioId: sessao.id,
      valorEmprestado: Number(valorEmprestado),
      tipoEmprestimo,
      jurosAoMes: Number(jurosAoMes) || 0,
      jurosAtraso: Boolean(jurosAtraso),
      tipoJurosAtraso: jurosAtraso ? tipoJurosAtraso : null,
      valorJurosAtraso: jurosAtraso ? jurosPorAtraso : 0,
      frequenciaJurosAtraso: jurosAtraso ? frequenciaJurosAtraso : null,
      multaAtraso: Boolean(multaAtraso),
      tipoMultaAtraso: multaAtraso ? tipoMultaAtraso : null,
      valorMultaAtraso: multaAtraso ? multa : 0,
      valorEntrada: entrada,
      dataEntrada: entrada && dataEntrada ? new Date(dataEntrada) : null,
      numeroParcelas: Number(numeroParcelas),
      frequencia,
      dataPrimeiraParcela: new Date(dataPrimeiraParcela),
      valorTotal: Number(valorEmprestado),
      valorLucro: 0,
      status: "em_dia",
      contaDesembolsoId: contaDesembolsoId || null,
      parcelas: {
        create: resultado.parcelas.map((p) => ({
          numero: p.numero,
          valor: p.valor,
          vencimento: p.vencimento,
          status: "a_vencer",
        })),
      },
    },
    include: { parcelas: true, cliente: true },
  });

  // --- Desconta o valor emprestado da conta escolhida (NOVO) --------------
  // Um Lancamento despesa já pago, dessa conta, no valor total emprestado —
  // reaproveita o mesmo saldo calculado (saldoInicial + receitas pagas -
  // despesas pagas) que a tela de Contas já usa, sem duplicar lógica. Ver
  // Parcela.lancamentoRetornoId em app/api/parcelas/[id]/route.ts pro
  // caminho inverso (o valor volta pra conta conforme as parcelas são pagas).
  if (contaDesembolsoId) {
    const lancamentoDesembolso = await prisma.lancamento.create({
      data: {
        descricao: `Empréstimo concedido - contrato ${contrato.codigo} (${cliente.nome})`,
        valor: Number(valorEmprestado),
        tipo: "despesa",
        status: "pago",
        dataVencimento: new Date(),
        dataPagamento: new Date(),
        valorPago: Number(valorEmprestado),
        contaId: contaDesembolsoId,
        usuarioId: sessao.id,
      },
    });
    contrato = await prisma.contrato.update({
      where: { id: contrato.id },
      data: { lancamentoDesembolsoId: lancamentoDesembolso.id },
      include: { parcelas: true, cliente: true },
    });
  }

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "CONTRATO_CRIADO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    descricao: `Contrato criado - ${contrato.codigo} (${cliente.nome})`,
    valor: Number(contrato.valorEmprestado) * -1, // saída de caixa ao emprestar
    dadosDepois: contrato,
  });

  return NextResponse.json(contrato, { status: 201 });
}
