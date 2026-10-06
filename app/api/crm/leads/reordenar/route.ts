// ============================================================================
// API: /api/crm/leads/reordenar
// POST -> persiste, de uma vez, a ordem final dos cards de uma coluna depois
//         de um arrastar-e-soltar (evita 1 PATCH por card reordenado).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { estagiosValidosDoUsuario } from "../../../../../lib/crmAutomacao";

import { registrarHistoricoCrm } from "../../../../../lib/crmHistoricoServidor";

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { estagio, idsNaOrdem } = body as { estagio: string; idsNaOrdem: string[] };

  const validos = await estagiosValidosDoUsuario(sessao.id);
  if (!validos.has(estagio) || !Array.isArray(idsNaOrdem)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  // Confirma que todos os ids pertencem ao usuário logado antes de gravar.
  const donos = await prisma.leadCrm.count({ where: { id: { in: idsNaOrdem }, usuarioId: sessao.id } });
  if (donos !== idsNaOrdem.length) {
    return NextResponse.json({ error: "Um ou mais leads não encontrados." }, { status: 404 });
  }

  await prisma.$transaction(async tx => {
    for (const [ordem, id] of idsNaOrdem.entries()) {
      const antes = await tx.leadCrm.findUniqueOrThrow({ where: { id, usuarioId: sessao.id } });
      const mudou = antes.estagio !== estagio;
      await tx.leadCrm.update({ where: { id }, data: { estagio, ordem, ...(mudou ? { movimentadoEm: new Date() } : {}) } });
      if (mudou) await registrarHistoricoCrm(tx, sessao.id, id, "Grupo alterado", [{ campo: "estagio", antes: antes.estagio, depois: estagio }]);
    }
  });

  return NextResponse.json({ ok: true });
}
