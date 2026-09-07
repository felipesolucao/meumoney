import { NextRequest, NextResponse } from "next/server";
import { obterSessao } from "../../../lib/auth";
import { MODELOS_COBRANCA } from "../../../lib/modelosCobranca";
import { prisma } from "../../../lib/prisma";

async function garantirPadroes(usuarioId: string) {
  await prisma.$transaction(
    MODELOS_COBRANCA.map((modelo) =>
      prisma.cobrancaModelo.upsert({
        where: { usuarioId_tipo: { usuarioId, tipo: modelo.tipo } },
        create: { usuarioId, tipo: modelo.tipo, mensagem: modelo.mensagem },
        update: {},
      })
    )
  );
}

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  await garantirPadroes(sessao.id);
  return NextResponse.json(await prisma.cobrancaModelo.findMany({ where: { usuarioId: sessao.id } }));
}

export async function PUT(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { tipo, mensagem } = await req.json();
  if (!MODELOS_COBRANCA.some((m) => m.tipo === tipo) || typeof mensagem !== "string" || !mensagem.trim()) {
    return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
  }
  const modelo = await prisma.cobrancaModelo.upsert({
    where: { usuarioId_tipo: { usuarioId: sessao.id, tipo } },
    create: { usuarioId: sessao.id, tipo, mensagem: mensagem.trim() },
    update: { mensagem: mensagem.trim() },
  });
  return NextResponse.json(modelo);
}
