import { NextRequest, NextResponse } from "next/server";
import { obterSessao } from "../../../../lib/auth";
import { CATEGORIAS_MODELO_CONTRATO } from "../../../../lib/modelosContrato";
import { prisma } from "../../../../lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.contratoModelo.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });

  const { titulo, categoria, mensagem } = await req.json();
  if (typeof titulo !== "string" || !titulo.trim()) return NextResponse.json({ error: "Informe um nome para o modelo." }, { status: 400 });
  if (!CATEGORIAS_MODELO_CONTRATO.some((c) => c.valor === categoria)) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  if (typeof mensagem !== "string" || !mensagem.trim()) return NextResponse.json({ error: "Informe a mensagem do modelo." }, { status: 400 });

  const modelo = await prisma.contratoModelo.update({
    where: { id: params.id },
    data: { titulo: titulo.trim(), categoria, mensagem: mensagem.trim() },
  });
  return NextResponse.json(modelo);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.contratoModelo.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });

  await prisma.contratoModelo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
