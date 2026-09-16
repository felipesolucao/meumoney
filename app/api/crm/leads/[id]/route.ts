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
import { aplicarAutomacoes, estagiosValidosDoUsuario } from "../../../../../lib/crmAutomacao";

const CAMPOS_TEXTO = [
  "nome", "codigo", "cnpj", "telefone", "telefone2", "email", "sindicatoPatronal", "origem", "observacoes", "statusPlanilha",
] as const;
const CAMPOS_NUMERO = ["valorEmAberto", "valorPago", "quantidadeParcelas", "quantidadeColaboradores"] as const;
const CAMPOS_DATA = ["parcelaMaisAntiga", "parcelaMaisRecente", "dataUltimoContato"] as const;

function dataOuNull(valor: unknown): Date | null {
  if (!valor) return null;
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  for (const campo of CAMPOS_DATA) {
    if (body[campo] !== undefined) dados[campo] = dataOuNull(body[campo]);
  }
  if (body.progresso !== undefined) {
    const n = Number(body.progresso);
    dados.progresso = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
  }

  if (body.nome !== undefined && !String(body.nome).trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  // Mudança de coluna (drag and drop) ou de posição dentro da mesma coluna.
  const estagioMudou = body.estagio !== undefined && body.estagio !== existente.estagio;
  if (body.estagio !== undefined) {
    const validos = await estagiosValidosDoUsuario(sessao.id);
    if (!validos.has(body.estagio)) {
      return NextResponse.json({ error: "Estágio inválido." }, { status: 400 });
    }
    dados.estagio = body.estagio;
    if (estagioMudou) dados.movimentadoEm = new Date();
  }
  if (body.ordem !== undefined) dados.ordem = Number(body.ordem) || 0;

  let lead = await prisma.leadCrm.update({ where: { id: params.id }, data: dados });

  // Automação só roda quando status/progresso realmente fazem parte desta
  // edição — nunca depois de um arraste manual (senão a regra "desfaria" a
  // troca de coluna feita à mão na hora).
  if (body.statusPlanilha !== undefined || body.progresso !== undefined) {
    lead = await aplicarAutomacoes(sessao.id, lead);
  }

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
