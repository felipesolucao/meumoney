// ============================================================================
// API: /api/lancamentos/[id]
// GET    -> detalhe do lançamento
// PATCH  -> marcar como pago/pendente, ou editar campos (não mexe na recorrência)
// DELETE -> exclui apenas esta ocorrência. Se ?serie=true, exclui a regra de
//           recorrência inteira (todas as ocorrências futuras e passadas).
// ----------------------------------------------------------------------------
// Todas as ações exigem que o lançamento pertença ao usuário logado.
// Toda alteração/exclusão grava um snapshot "antes" em HistoricoAcao, o que
// permite desfazer (reverter) a ação depois pela tela de Histórico.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { registrarAcao } from "../../../../lib/historico";

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

  const sinal = existente.tipo === "receita" ? 1 : -1;

  // --- Ações rápidas usadas pelos botões da lista --------------------------
  if (acao === "pagar") {
    const lancamento = await prisma.lancamento.update({
      where: { id: params.id },
      data: { status: "pago", dataPagamento: new Date(), valorPago: existente.valor },
    });
    await registrarAcao(prisma, {
      usuarioId: sessao.id,
      tipo: "LANCAMENTO_PAGO",
      entidade: "Lancamento",
      entidadeId: lancamento.id,
      descricao: `${existente.tipo === "receita" ? "Recebido" : "Pago"}: ${existente.descricao}`,
      valor: Number(existente.valor) * sinal,
      dadosAntes: existente,
      dadosDepois: lancamento,
    });
    return NextResponse.json(lancamento);
  }

  if (acao === "reabrir") {
    const lancamento = await prisma.lancamento.update({
      where: { id: params.id },
      data: { status: "pendente", dataPagamento: null, valorPago: null },
    });
    await registrarAcao(prisma, {
      usuarioId: sessao.id,
      tipo: "LANCAMENTO_REABERTO",
      entidade: "Lancamento",
      entidadeId: lancamento.id,
      descricao: `Reaberto: ${existente.descricao}`,
      valor: Number(existente.valor) * sinal,
      dadosAntes: existente,
      dadosDepois: lancamento,
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

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "LANCAMENTO_EDITADO",
    entidade: "Lancamento",
    entidadeId: lancamento.id,
    descricao: `Lançamento editado: ${lancamento.descricao}`,
    valor: Number(lancamento.valor) * sinal,
    dadosAntes: existente,
    dadosDepois: lancamento,
  });

  return NextResponse.json(lancamento);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lancamento = await prisma.lancamento.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!lancamento) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

  const excluirSerie = req.nextUrl.searchParams.get("serie") === "true";
  const sinal = lancamento.tipo === "receita" ? 1 : -1;

  if (excluirSerie && lancamento.recorrenteId) {
    // Excluir a regra apaga em cascata todas as ocorrências dela (ver schema).
    // Confere de novo que a regra também é do usuário logado antes de apagar.
    const regra = await prisma.lancamentoRecorrente.findFirst({
      where: { id: lancamento.recorrenteId, usuarioId: sessao.id },
    });
    if (regra) {
      await prisma.lancamentoRecorrente.delete({ where: { id: regra.id } });
      await registrarAcao(prisma, {
        usuarioId: sessao.id,
        tipo: "LANCAMENTO_SERIE_EXCLUIDA",
        entidade: "Lancamento",
        entidadeId: lancamento.id,
        descricao: `Série excluída: ${lancamento.descricao}`,
        valor: Number(lancamento.valor) * sinal,
        dadosAntes: { regra, lancamento },
        // Nota: por envolver múltiplos registros em cascata, a reversão de uma
        // série inteira não é suportada automaticamente — ver lib/historico.ts.
      });
      return NextResponse.json({ ok: true });
    }
  }

  await prisma.lancamento.delete({ where: { id: params.id } });

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "LANCAMENTO_EXCLUIDO",
    entidade: "Lancamento",
    entidadeId: lancamento.id,
    descricao: `Lançamento excluído: ${lancamento.descricao}`,
    valor: Number(lancamento.valor) * sinal,
    dadosAntes: lancamento,
  });

  return NextResponse.json({ ok: true });
}
