// ============================================================================
// API: /api/crm/leads/[id]
// PATCH  -> edita os dados do lead E/OU move ele de coluna/posição (drag&drop)
// DELETE -> remove o lead
// ----------------------------------------------------------------------------
// Toda ação exige que o lead pertença ao usuário logado — senão 404, como se
// o registro não existisse.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { ESTAGIOS_IDS } from "../../../../../lib/crm";

const CAMPOS_TEXTO = ["nome", "cnpj", "telefone", "telefone2", "email", "sindicatoPatronal", "origem", "observacoes"] as const;
const CAMPOS_NUMERO = ["valorEmAberto", "quantidadeParcelas", "quantidadeColaboradores"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.leadCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const body = await req.json();
  const dados: Record<string, unknown> = {};

  for (const campo of CAMPOS_TEXTO) {
    if (body[campo] !== undefined) dados[campo] = body[campo] === null ? null : String(body[campo]).trim() || null;
  }
  for (const campo of CAMPOS_NUMERO) {
    if (body[campo] !== undefined) {
      const n = body[campo] === null || body[campo] === "" ? null : Number(body[campo]);
      dados[campo] = n === null || Number.isNaN(n) ? null : n;
    }
  }

  if (body.nome !== undefined && !String(body.nome).trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  // Mudança de coluna (drag and drop) ou de posição dentro da mesma coluna.
  const estagioMudou = body.estagio !== undefined && body.estagio !== existente.estagio;
  if (body.estagio !== undefined) {
    if (!ESTAGIOS_IDS.includes(body.estagio)) {
      return NextResponse.json({ error: "Estágio inválido." }, { status: 400 });
    }
    dados.estagio = body.estagio;
    if (estagioMudou) dados.movimentadoEm = new Date();
  }
  if (body.ordem !== undefined) dados.ordem = Number(body.ordem) || 0;

  const lead = await prisma.leadCrm.update({ where: { id: params.id }, data: dados });
  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.leadCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  await prisma.leadCrm.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
