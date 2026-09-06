// ============================================================================
// API: /api/lancamentos
// ----------------------------------------------------------------------------
// GET  -> lista lançamentos (receitas e despesas), com filtros por query string:
//         ?tipo=receita|despesa   ?origem=pessoal|empresarial
//         ?status=pendente|pago|atrasado    ?de=YYYY-MM-DD&ate=YYYY-MM-DD
//
// POST -> cria um lançamento. Se "recorrente" vier true, cria a regra em
//         LancamentoRecorrente e gera todas as ocorrências (parceladas ou
//         com data de fim) ou o primeiro lote (contas fixas sem fim).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { gerarOcorrencias, statusEfetivoLancamento } from "../../../lib/financeiro";
import type { TipoLancamento, OrigemFinanceira, PeriodicidadeLancamento, TipoFimRecorrencia } from "../../../lib/financeiro";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const tipo = params.get("tipo");
  const origem = params.get("origem");
  const status = params.get("status");
  const de = params.get("de");
  const ate = params.get("ate");

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo = tipo;
  if (origem) where.origem = origem;
  if (de || ate) {
    where.dataVencimento = {
      ...(de ? { gte: new Date(`${de}T00:00:00`) } : {}),
      ...(ate ? { lte: new Date(`${ate}T23:59:59`) } : {}),
    };
  }
  // "atrasado" não existe como valor salvo no banco (é calculado a partir da
  // data de vencimento), então tratamos como "pendente com vencimento no passado".
  if (status === "pendente" || status === "pago") where.status = status;

  const lancamentos = await prisma.lancamento.findMany({
    where,
    include: { categoria: true, conta: true, recorrente: true },
    orderBy: { dataVencimento: "asc" },
  });

  const filtrados =
    status === "atrasado"
      ? lancamentos.filter((l) => statusEfetivoLancamento(l.status, l.dataVencimento) === "atrasado")
      : lancamentos;

  return NextResponse.json(filtrados);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    descricao,
    valor,
    tipo,
    origem,
    status,
    dataVencimento,
    categoriaId,
    contaId,
    observacoes,
    recorrente,
    periodicidade,
    tipoFim,
    dataFim,
    numeroParcelas,
  } = body as {
    descricao: string;
    valor: number;
    tipo: TipoLancamento;
    origem: OrigemFinanceira;
    status: "pendente" | "pago";
    dataVencimento: string;
    categoriaId?: string;
    contaId?: string;
    observacoes?: string;
    recorrente?: boolean;
    periodicidade?: PeriodicidadeLancamento;
    tipoFim?: TipoFimRecorrencia;
    dataFim?: string;
    numeroParcelas?: number;
  };

  // --- Validação básica ----------------------------------------------------
  if (!descricao || !valor || !tipo || !dataVencimento) {
    return NextResponse.json({ error: "Preencha descrição, valor, tipo e data." }, { status: 400 });
  }

  const dadosComuns = {
    descricao,
    valor: Number(valor),
    tipo,
    origem: origem || "pessoal",
    categoriaId: categoriaId || undefined,
    contaId: contaId || undefined,
    observacoes: observacoes || undefined,
  };

  // --- Lançamento avulso (sem recorrência) ----------------------------------
  if (!recorrente) {
    const lancamento = await prisma.lancamento.create({
      data: {
        ...dadosComuns,
        status: status || "pendente",
        dataVencimento: new Date(dataVencimento),
        dataPagamento: status === "pago" ? new Date() : null,
        valorPago: status === "pago" ? Number(valor) : null,
      },
      include: { categoria: true, conta: true },
    });
    return NextResponse.json(lancamento, { status: 201 });
  }

  // --- Lançamento recorrente (fixo, com data de fim, ou parcelado) ---------
  if (!periodicidade || !tipoFim) {
    return NextResponse.json({ error: "Informe a periodicidade e o tipo de fim da recorrência." }, { status: 400 });
  }

  const regra = await prisma.lancamentoRecorrente.create({
    data: {
      ...dadosComuns,
      periodicidade,
      tipoFim,
      dataInicio: new Date(dataVencimento),
      dataFim: tipoFim === "data_fim" && dataFim ? new Date(dataFim) : null,
      numeroParcelas: tipoFim === "parcelas" ? Number(numeroParcelas) || 1 : null,
    },
  });

  const ocorrencias = gerarOcorrencias({
    descricao,
    valor: Number(valor),
    periodicidade,
    tipoFim,
    desde: new Date(dataVencimento),
    dataFim: regra.dataFim,
    numeroParcelas: regra.numeroParcelas,
  });

  await prisma.lancamento.createMany({
    data: ocorrencias.map((o, i) => ({
      descricao: o.descricao,
      valor: o.valor,
      tipo,
      origem: origem || "pessoal",
      categoriaId: categoriaId || undefined,
      contaId: contaId || undefined,
      observacoes: observacoes || undefined,
      // Só a primeira ocorrência pode nascer já paga (ex: recebimento de hoje
      // que também vai se repetir todo mês); as seguintes nascem pendentes.
      status: i === 0 && status === "pago" ? "pago" : "pendente",
      dataPagamento: i === 0 && status === "pago" ? new Date() : null,
      valorPago: i === 0 && status === "pago" ? o.valor : null,
      dataVencimento: o.dataVencimento,
      recorrenteId: regra.id,
      numeroParcela: o.numeroParcela,
    })),
  });

  const lancamentosCriados = await prisma.lancamento.findMany({
    where: { recorrenteId: regra.id },
    include: { categoria: true, conta: true },
    orderBy: { dataVencimento: "asc" },
  });

  return NextResponse.json({ recorrente: regra, lancamentos: lancamentosCriados }, { status: 201 });
}
