// ============================================================================
// API: /api/contratos/[id]
// GET    -> detalhe do contrato, com cliente e parcelas
// DELETE -> exclui o contrato (e parcelas, via cascade)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { registrarAcao } from "../../../../lib/historico";

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

// PATCH -> edição leve do contrato: só campos que NÃO exigem recalcular as
// parcelas já geradas (juros/valor/parcelas ficam travados após a criação,
// para não deixar o contrato com dados inconsistentes com as parcelas).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.contrato.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  const body = await req.json();
  const { jurosAtraso } = body as { jurosAtraso?: boolean };

  const contrato = await prisma.contrato.update({
    where: { id: params.id },
    data: {
      ...(jurosAtraso !== undefined ? { jurosAtraso: Boolean(jurosAtraso) } : {}),
    },
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.contrato.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { cliente: true },
  });
  if (!existente) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

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
