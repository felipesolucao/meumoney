// ============================================================================
// API: /api/lancamentos/[id]
// GET    -> detalhe do lançamento
// PATCH  -> marcar como pago/pendente, ou editar campos (não mexe na recorrência)
// DELETE -> exclui apenas esta ocorrência. Se ?serie=true, exclui a regra de
//           recorrência inteira (todas as ocorrências futuras e passadas).
// ----------------------------------------------------------------------------
// Todas as ações exigem que o lançamento pertença ao usuário logado.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lancamento = await prisma.lancamento.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { categoria: true, conta: true, recorrente: true },
  });
  if (!lancamento) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }
  return NextResponse.json(lancamento);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.lancamento.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

  const body = await req.json();
  const { acao, ...campos } = body as {
    acao?: "pagar" | "reabrir";
    descricao?: string;
    valor?: number;
    dataVencimento?: string;
    categoriaId?: string;
    contaId?: string;
    observacoes?: string;
  };

  // --- Ações rápidas usadas pelos botões da lista --------------------------
  if (acao === "pagar") {
    const lancamento = await prisma.lancamento.update({
      where: { id: params.id },
      data: { status: "pago", dataPagamento: new Date(), valorPago: existente.valor },
    });
    return NextResponse.json(lancamento);
  }

  if (acao === "reabrir") {
    const lancamento = await prisma.lancamento.update({
      where: { id: params.id },
      data: { status: "pendente", dataPagamento: null, valorPago: null },
    });
    return NextResponse.json(lancamento);
  }

  // --- Edição geral dos campos ----------------------------------------------
  const lancamento = await prisma.lancamento.update({
    where: { id: params.id },
    data: {
      ...(campos.descricao !== undefined ? { descricao: campos.descricao } : {}),
      ...(campos.valor !== undefined ? { valor: Number(campos.valor) } : {}),
      ...(campos.dataVencimento !== undefined ? { dataVencimento: new Date(campos.dataVencimento) } : {}),
      ...(campos.categoriaId !== undefined ? { categoriaId: campos.categoriaId || null } : {}),
      ...(campos.contaId !== undefined ? { contaId: campos.contaId || null } : {}),
      ...(campos.observacoes !== undefined ? { observacoes: campos.observacoes || null } : {}),
    },
  });
  return NextResponse.json(lancamento);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lancamento = await prisma.lancamento.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!lancamento) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

  const excluirSerie = req.nextUrl.searchParams.get("serie") === "true";

  if (excluirSerie && lancamento.recorrenteId) {
    // Excluir a regra apaga em cascata todas as ocorrências dela (ver schema).
    // Confere de novo que a regra também é do usuário logado antes de apagar.
    const regra = await prisma.lancamentoRecorrente.findFirst({
      where: { id: lancamento.recorrenteId, usuarioId: sessao.id },
    });
    if (regra) {
      await prisma.lancamentoRecorrente.delete({ where: { id: regra.id } });
      return NextResponse.json({ ok: true });
    }
  }

  await prisma.lancamento.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
