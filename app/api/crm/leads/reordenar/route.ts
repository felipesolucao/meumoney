// ============================================================================
// API: /api/crm/leads/reordenar
// POST -> persiste, de uma vez, a ordem final dos cards de uma coluna depois
//         de um arrastar-e-soltar (evita 1 PATCH por card reordenado).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { EstagioLeadCrm } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { ESTAGIOS_IDS } from "../../../../../lib/crm";

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { estagio, idsNaOrdem } = body as { estagio: EstagioLeadCrm; idsNaOrdem: string[] };

  if (!ESTAGIOS_IDS.includes(estagio) || !Array.isArray(idsNaOrdem)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  // Confirma que todos os ids pertencem ao usuário logado antes de gravar.
  const donos = await prisma.leadCrm.count({ where: { id: { in: idsNaOrdem }, usuarioId: sessao.id } });
  if (donos !== idsNaOrdem.length) {
    return NextResponse.json({ error: "Um ou mais leads não encontrados." }, { status: 404 });
  }

  await prisma.$transaction(
    idsNaOrdem.map((id, indice) => prisma.leadCrm.update({ where: { id }, data: { estagio, ordem: indice } })),
  );

  return NextResponse.json({ ok: true });
}
