import { NextRequest, NextResponse } from "next/server";
import { obterSessao } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const alerta = await prisma.atendimentoCrm.findFirst({
    where: { id: params.id, usuarioId: sessao.id, alertaEm: { not: null }, lead: { usuarioId: sessao.id } },
    select: { id: true },
  });
  if (!alerta) return NextResponse.json({ error: "Alerta não encontrado." }, { status: 404 });

  await prisma.atendimentoCrm.update({
    where: { id: alerta.id },
    data: { alertaConcluidoEm: new Date() },
  });
  return NextResponse.json({ ok: true });
}
