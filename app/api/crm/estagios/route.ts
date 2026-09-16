// ============================================================================
// API: /api/crm/estagios
// GET -> configuração das colunas do quadro (ordem, visibilidade, nome
//        personalizado) já mesclada com os padrões — ver mesclarEstagiosConfig
//        em lib/crm.ts. Usada pra recarregar depois de mudanças no painel
//        "Gerenciar grupos".
// ============================================================================
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { mesclarEstagiosConfig } from "../../../../lib/crm";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const configs = await prisma.estagioCrmConfig.findMany({ where: { usuarioId: sessao.id } });
  return NextResponse.json(mesclarEstagiosConfig(configs));
}
