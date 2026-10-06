import { NextRequest, NextResponse } from "next/server";
import { obterSessao } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

import { registrarAtendimentoCrm } from "../../../../../lib/crmHistoricoServidor";

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const alerta = await prisma.atendimentoCrm.findFirst({
    where: { id: params.id, usuarioId: sessao.id, alertaEm: { not: null }, lead: { usuarioId: sessao.id } },
    select: { id: true, leadId: true, alertaConcluidoEm: true },
  });
  if (!alerta) return NextResponse.json({ error: "Alerta não encontrado." }, { status: 404 });

  if (!alerta.alertaConcluidoEm) await prisma.$transaction(async tx => {
    const salvo = await tx.atendimentoCrm.update({ where: { id: alerta.id }, data: { alertaConcluidoEm: new Date() }, select: { alertaConcluidoEm: true } });
    await registrarAtendimentoCrm(tx, sessao.id, alerta.leadId, "Alerta concluído", alerta, salvo);
  });
  return NextResponse.json({ ok: true });
}
