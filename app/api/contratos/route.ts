// ============================================================================
// API: /api/contratos
// GET  -> lista os contratos DO USUÁRIO LOGADO, com cliente e parcelas
// POST -> cria um novo contrato + gera automaticamente todas as parcelas
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";
import { calcularContrato, gerarCodigoContrato, TipoEmprestimo, Frequencia } from "../../../lib/calculos";

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
    numeroParcelas,
    frequencia,
    dataPrimeiraParcela,
  } = body as {
    clienteId: string;
    valorEmprestado: number;
    tipoEmprestimo: TipoEmprestimo;
    jurosAoMes: number;
    jurosAtraso: boolean;
    numeroParcelas: number;
    frequencia: Frequencia;
    dataPrimeiraParcela: string;
  };

  // --- Validação básica dos campos obrigatórios --------------------------
  if (!clienteId || !valorEmprestado || !numeroParcelas || !frequencia || !dataPrimeiraParcela) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  // O cliente precisa existir E pertencer ao usuário logado.
  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, usuarioId: sessao.id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  // --- Cálculo financeiro (juros, valor total, parcelas) ------------------
  const resultado = calcularContrato({
    valorEmprestado: Number(valorEmprestado),
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

  return NextResponse.json(contrato, { status: 201 });
}
