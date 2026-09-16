// ============================================================================
// API: /api/crm/estagios/reordenar
// POST -> persiste, de uma vez, a nova ordem das colunas do quadro depois de
//         arrastar uma pra outra posição (ver cabeçalho arrastável em
//         CrmBoard.tsx). Mesmo padrão de app/api/crm/leads/reordenar.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { mesclarEstagiosConfig } from "../../../../../lib/crm";
import { estagiosValidosDoUsuario } from "../../../../../lib/crmAutomacao";

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { idsNaOrdem } = body as { idsNaOrdem: string[] };

  const validos = await estagiosValidosDoUsuario(sessao.id);
  if (!Array.isArray(idsNaOrdem) || idsNaOrdem.some((id) => !validos.has(id))) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  await prisma.$transaction(
    idsNaOrdem.map((estagio, indice) =>
      prisma.estagioCrmConfig.upsert({
        where: { usuarioId_estagio: { usuarioId: sessao.id, estagio } },
        update: { ordem: indice },
        create: { usuarioId: sessao.id, estagio, ordem: indice },
      }),
    ),
  );

  const configs = await prisma.estagioCrmConfig.findMany({ where: { usuarioId: sessao.id } });
  return NextResponse.json(mesclarEstagiosConfig(configs));
}
