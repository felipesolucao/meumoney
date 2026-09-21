import { NextResponse } from "next/server";
import { obterSessao } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

// Central do sino: somente lembretes ainda pendentes do usuário autenticado.
// A ordenação no banco é a mesma exibida no popup (mais urgente primeiro).
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const alertas = await prisma.atendimentoCrm.findMany({
    where: {
      usuarioId: sessao.id,
      alertaEm: { not: null },
      alertaConcluidoEm: null,
      lead: { usuarioId: sessao.id },
    },
    orderBy: { alertaEm: "asc" },
    select: {
      id: true,
      observacao: true,
      alertaEm: true,
      lead: { select: { id: true, nome: true, cnpj: true } },
    },
  });

  return NextResponse.json(alertas);
}
