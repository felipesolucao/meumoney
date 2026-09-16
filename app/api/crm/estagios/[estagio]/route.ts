// ============================================================================
// API: /api/crm/estagios/[estagio]
// PATCH -> muda visibilidade e/ou nome personalizado de uma coluna do quadro
//          (ver painel "Gerenciar grupos", GerenciarGruposPainel.tsx). "id" e
//          cor continuam fixos — só existe upsert de ordem/visivel/nome.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { mesclarEstagiosConfig } from "../../../../../lib/crm";
import { estagiosValidosDoUsuario } from "../../../../../lib/crmAutomacao";

export async function PATCH(req: NextRequest, { params }: { params: { estagio: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const validos = await estagiosValidosDoUsuario(sessao.id);
  if (!validos.has(params.estagio)) {
    return NextResponse.json({ error: "Grupo inválido." }, { status: 400 });
  }
  const estagio = params.estagio;

  const body = await req.json();
  const dados: { visivel?: boolean; nomePersonalizado?: string | null } = {};
  if (body.visivel !== undefined) dados.visivel = Boolean(body.visivel);
  if (body.nomePersonalizado !== undefined) {
    dados.nomePersonalizado = body.nomePersonalizado === null ? null : String(body.nomePersonalizado).trim() || null;
  }

  await prisma.estagioCrmConfig.upsert({
    where: { usuarioId_estagio: { usuarioId: sessao.id, estagio } },
    update: dados,
    create: { usuarioId: sessao.id, estagio, ...dados },
  });

  const configs = await prisma.estagioCrmConfig.findMany({ where: { usuarioId: sessao.id } });
  return NextResponse.json(mesclarEstagiosConfig(configs));
}
