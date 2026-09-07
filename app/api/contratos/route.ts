// ============================================================================
// API: /api/contratos
// GET  -> lista os contratos DO USUÁRIO LOGADO, com cliente e parcelas
// POST -> cria um novo contrato + gera automaticamente todas as parcelas
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";
import { calcularContrato, gerarCodigoContrato, TipoEmprestimo, Frequencia } from "../../../lib/calculos";
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
    multaAtraso,
    tipoMultaAtraso,
    valorMultaAtraso,
    valorEntrada,
    dataEntrada,
    numeroParcelas,
    frequencia,
    dataPrimeiraParcela,
  } = body as {
    clienteId: string;
    valorEmprestado: number;
    tipoEmprestimo: TipoEmprestimo;
    jurosAoMes: number;
    jurosAtraso: boolean;
    multaAtraso?: boolean;
    tipoMultaAtraso?: "fixa" | "percentual";
    valorMultaAtraso?: number;
    valorEntrada?: number;
    dataEntrada?: string;
    numeroParcelas: number;
    frequencia: Frequencia;
    dataPrimeiraParcela: string;
  };

  // --- Validação básica dos campos obrigatórios --------------------------
  if (!clienteId || !valorEmprestado || !numeroParcelas || !frequencia || !dataPrimeiraParcela) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }
  const entrada = Number(valorEntrada) || 0;
  const multa = Number(valorMultaAtraso) || 0;
  if (entrada < 0 || entrada >= Number(valorEmprestado)) {
    return NextResponse.json({ error: "A entrada deve ser menor que o valor do contrato." }, { status: 400 });
  }
  if (multaAtraso && (!tipoMultaAtraso || multa <= 0 || (tipoMultaAtraso === "percentual" && multa > 100))) {
    return NextResponse.json({ error: "Informe uma multa por atraso válida." }, { status: 400 });
  }

  // O cliente precisa existir E pertencer ao usuário logado.
  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, usuarioId: sessao.id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  // --- Cálculo financeiro (juros, valor total, parcelas) ------------------
  const resultado = calcularContrato({
    valorEmprestado: Number(valorEmprestado) - entrada,
    tipoEmprestimo,
    jurosAoMes: Number(jurosAoMes) || 0,
    numeroParcelas: Number(numeroParcelas),
    frequencia,
    dataPrimeiraParcela: new Date(dataPrimeiraParcela),
  });

  // --- Gera um código único para o contrato (tenta até não colidir) -------
  let codigo = gerarCodigoContrato();
  while (await prisma.contrato.findUnique({ where: { codigo } })) {
    codigo = gerarCodigoContrato();
  }

  const contrato = await prisma.contrato.create({
    data: {
      codigo,
      clienteId,
      usuarioId: sessao.id,
      valorEmprestado: Number(valorEmprestado),
      tipoEmprestimo,
      jurosAoMes: Number(jurosAoMes) || 0,
      jurosAtraso: Boolean(jurosAtraso),
      multaAtraso: Boolean(multaAtraso),
      tipoMultaAtraso: multaAtraso ? tipoMultaAtraso : null,
      valorMultaAtraso: multaAtraso ? multa : 0,
      valorEntrada: entrada,
      dataEntrada: entrada && dataEntrada ? new Date(dataEntrada) : null,
      numeroParcelas: Number(numeroParcelas),
      frequencia,
      dataPrimeiraParcela: new Date(dataPrimeiraParcela),
      valorTotal: resultado.valorTotal,
      valorLucro: resultado.valorLucro,
      status: "em_dia",
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
