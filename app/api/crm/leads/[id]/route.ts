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

import { compararCamposCrm } from "../../../../../lib/crmHistorico";
import { registrarHistoricoCrm } from "../../../../../lib/crmHistoricoServidor";

const CAMPOS_TEXTO = [
  "nome", "codigo", "cnpj", "telefone", "telefone2", "email", "sindicatoPatronal", "origem", "observacoes", "statusPlanilha",
] as const;
const CAMPOS_NUMERO = ["valorEmAberto", "valorTotalComJuros", "valorPago", "quantidadeParcelas", "quantidadeColaboradores"] as const;
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

  if (body.nome !== undefined && !dados.nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  // Mudança de coluna (drag and drop) ou de posição dentro da mesma coluna.
  if (body.estagio !== undefined) {
    const validos = await estagiosValidosDoUsuario(sessao.id);
    if (!validos.has(body.estagio)) {
      return NextResponse.json({ error: "Estágio inválido." }, { status: 400 });
    }
    dados.estagio = body.estagio;
  }
  if (body.ordem !== undefined) dados.ordem = Number(body.ordem) || 0;

  const lead = await prisma.$transaction(async tx => {
    const atual = await tx.leadCrm.findUniqueOrThrow({ where: { id: params.id, usuarioId: sessao.id } });
    const alteracoes = compararCamposCrm(atual, dados);
    if (alteracoes.length) dados.movimentadoEm = new Date();
    let salvo = await tx.leadCrm.update({ where: { id: params.id }, data: dados });
    await registrarHistoricoCrm(tx, sessao.id, params.id, alteracoes.some(a => a.campo === "estagio") ? "Grupo alterado" : "Cadastro editado", alteracoes);
    if (alteracoes.some(a => a.campo === "statusPlanilha" || a.campo === "progresso")) {
      salvo = await aplicarAutomacoes(sessao.id, salvo, tx);
    }
    return salvo;
  });

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
