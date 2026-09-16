// ============================================================================
// API: /api/crm/automacoes
// GET  -> lista as regras de automação do usuário, na ordem de avaliação
// POST -> cria uma nova regra (entra no fim da ordem)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { ESTAGIOS_IDS } from "../../../../lib/crm";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const regras = await prisma.automacaoCrm.findMany({ where: { usuarioId: sessao.id }, orderBy: { ordem: "asc" } });
  return NextResponse.json(regras);
}

function numeroOuNull(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { nome, estagioDestino, statusPlanilha, progressoMin, progressoMax, ativo } = body;

  if (!nome || !String(nome).trim()) {
    return NextResponse.json({ error: "Dê um nome para a regra." }, { status: 400 });
  }
  if (!ESTAGIOS_IDS.includes(estagioDestino)) {
    return NextResponse.json({ error: "Escolha uma etapa de destino válida." }, { status: 400 });
  }

  const total = await prisma.automacaoCrm.count({ where: { usuarioId: sessao.id } });

  const regra = await prisma.automacaoCrm.create({
    data: {
      nome: String(nome).trim(),
      estagioDestino,
      statusPlanilha: statusPlanilha?.trim() || null,
      progressoMin: numeroOuNull(progressoMin),
      progressoMax: numeroOuNull(progressoMax),
      ativo: ativo !== false,
      ordem: total,
      usuarioId: sessao.id,
    },
  });

  return NextResponse.json(regra, { status: 201 });
}
