import { NextRequest, NextResponse } from "next/server";
import { obterSessao } from "../../../lib/auth";
import { CATEGORIAS_MODELO_CONTRATO, MODELOS_CONTRATO_PADRAO } from "../../../lib/modelosContrato";
import { prisma } from "../../../lib/prisma";

async function garantirPadroes(usuarioId: string) {
  const existentes = await prisma.contratoModelo.count({ where: { usuarioId } });
  if (existentes === 0) {
    await prisma.contratoModelo.createMany({
      data: MODELOS_CONTRATO_PADRAO.map((modelo) => ({ usuarioId, ...modelo })),
    });
  }
}

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  await garantirPadroes(sessao.id);
  return NextResponse.json(await prisma.contratoModelo.findMany({ where: { usuarioId: sessao.id }, orderBy: { criadoEm: "asc" } }));
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { titulo, categoria, mensagem } = await req.json();
  if (typeof titulo !== "string" || !titulo.trim()) return NextResponse.json({ error: "Informe um nome para o modelo." }, { status: 400 });
  if (!CATEGORIAS_MODELO_CONTRATO.some((c) => c.valor === categoria)) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  if (typeof mensagem !== "string" || !mensagem.trim()) return NextResponse.json({ error: "Informe a mensagem do modelo." }, { status: 400 });

  const modelo = await prisma.contratoModelo.create({
    data: { usuarioId: sessao.id, titulo: titulo.trim(), categoria, mensagem: mensagem.trim() },
  });
  return NextResponse.json(modelo, { status: 201 });
}
