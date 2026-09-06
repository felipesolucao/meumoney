// ============================================================================
// API: /api/clientes/[id]
// GET    -> detalhe do cliente com todos os contratos e parcelas
// PATCH  -> atualiza dados cadastrais do cliente
// DELETE -> remove o cliente (e seus contratos/parcelas, via cascade)
// ----------------------------------------------------------------------------
// Todas as ações aqui exigem que o cliente pertença ao usuário logado —
// senão respondem 404, como se o cliente não existisse (não revelamos que
// o registro existe na conta de outra pessoa).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const cliente = await prisma.cliente.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: {
      contratos: {
        orderBy: { criadoEm: "desc" },
        include: { parcelas: { orderBy: { numero: "asc" } } },
      },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  return NextResponse.json(cliente);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.cliente.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const body = await req.json();
  const { nome, telefone, cpf, score } = body;

  const cliente = await prisma.cliente.update({
    where: { id: params.id },
    data: {
      ...(nome !== undefined && { nome }),
      ...(telefone !== undefined && { telefone }),
      ...(cpf !== undefined && { cpf }),
      ...(score !== undefined && { score }),
    },
  });

  return NextResponse.json(cliente);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.cliente.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  await prisma.cliente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
