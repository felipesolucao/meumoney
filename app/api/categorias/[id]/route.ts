// ============================================================================
// API: /api/categorias/[id]
// PATCH  -> renomeia a categoria e/ou troca o emoji (ícone)
// DELETE -> exclui a categoria do usuário logado
// ----------------------------------------------------------------------------
// Lançamentos que já usam essa categoria NÃO são apagados: a coluna
// categoriaId deles simplesmente vira NULL (ON DELETE SET NULL, ver schema),
// então o histórico financeiro continua intacto, só sem categoria.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.categoria.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });

  const body = await req.json();
  const { nome, icone, cor } = body as { nome?: string; icone?: string; cor?: string };

  if (nome !== undefined && !nome.trim()) {
    return NextResponse.json({ error: "O nome da categoria não pode ficar em branco." }, { status: 400 });
  }

  const categoria = await prisma.categoria.update({
    where: { id: params.id },
    data: {
      ...(nome !== undefined ? { nome: nome.trim() } : {}),
      ...(icone !== undefined ? { icone } : {}),
      ...(cor !== undefined ? { cor } : {}),
    },
  });
  return NextResponse.json(categoria);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.categoria.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });

  await prisma.categoria.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
