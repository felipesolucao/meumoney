// ============================================================================
// API: /api/crm/estagios
// GET  -> configuração das colunas do quadro (ordem, visibilidade, nome
//         personalizado) já mesclada com os padrões — ver mesclarEstagiosConfig
//         em lib/crm.ts. Usada pra recarregar depois de mudanças no painel
//         "Gerenciar grupos".
// POST -> cria um grupo/coluna NOVO (fora dos 11 padrão), com id gerado —
//         ver GerenciarGruposPainel.tsx. Entra sempre visível, no fim do
//         quadro.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { ESTAGIOS, PALETA_CORES_GRUPO, mesclarEstagiosConfig } from "../../../../lib/crm";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const configs = await prisma.estagioCrmConfig.findMany({ where: { usuarioId: sessao.id } });
  return NextResponse.json(mesclarEstagiosConfig(configs));
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const nome = String(body?.nome || "").trim();
  if (!nome) return NextResponse.json({ error: "Dê um nome para o grupo." }, { status: 400 });

  const configsAtuais = await prisma.estagioCrmConfig.findMany({ where: { usuarioId: sessao.id } });
  const maiorOrdem = configsAtuais.reduce((max, c) => Math.max(max, c.ordem), ESTAGIOS.length - 1);
  const totalCustomizados = configsAtuais.filter((c) => !ESTAGIOS.some((e) => e.id === c.estagio)).length;
  const cor = PALETA_CORES_GRUPO[totalCustomizados % PALETA_CORES_GRUPO.length];

  // Id só precisa ser único e nunca colidir com um dos 11 padrão — não
  // aparece pra ninguém, é só a chave interna do grupo.
  const estagioId = `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  await prisma.estagioCrmConfig.create({
    data: { usuarioId: sessao.id, estagio: estagioId, nomePersonalizado: nome, cor, ordem: maiorOrdem + 1, visivel: true },
  });

  const configs = await prisma.estagioCrmConfig.findMany({ where: { usuarioId: sessao.id } });
  return NextResponse.json(mesclarEstagiosConfig(configs), { status: 201 });
}
