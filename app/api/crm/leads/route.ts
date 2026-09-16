// ============================================================================
// API: /api/crm/leads
// GET    -> lista todos os leads DO USUÁRIO LOGADO (para montar o quadro)
// POST   -> cria um novo lead, sempre no topo da coluna escolhida
// DELETE -> exclusão em massa: { ids: [...] } exclui só os informados,
//           { todos: true } exclui todos os leads do usuário (painel de
//           gerenciar leads, ver components/crm/GerenciarLeadsPainel.tsx)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { aplicarAutomacoes, estagiosValidosDoUsuario } from "../../../../lib/crmAutomacao";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const leads = await prisma.leadCrm.findMany({
    where: { usuarioId: sessao.id },
    orderBy: [{ estagio: "asc" }, { ordem: "asc" }],
  });
  return NextResponse.json(leads);
}

function numeroOuNull(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function dataOuNull(valor: unknown): Date | null {
  if (!valor) return null;
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const {
    nome, estagio, codigo, valorEmAberto, valorPago, quantidadeParcelas, quantidadeColaboradores,
    cnpj, telefone, telefone2, email, sindicatoPatronal, origem, observacoes,
    parcelaMaisAntiga, parcelaMaisRecente, dataUltimoContato, statusPlanilha, progresso,
  } = body;

  if (!nome || !String(nome).trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const validos = await estagiosValidosDoUsuario(sessao.id);
  const estagioFinal = validos.has(estagio) ? estagio : "primeira_tentativa";

  // Novo card entra no topo da coluna — todos os outros descem uma posição.
  await prisma.leadCrm.updateMany({
    where: { usuarioId: sessao.id, estagio: estagioFinal },
    data: { ordem: { increment: 1 } },
  });

  let lead = await prisma.leadCrm.create({
    data: {
      nome: String(nome).trim(),
      estagio: estagioFinal,
      ordem: 0,
      codigo: codigo?.trim() || null,
      valorEmAberto: numeroOuNull(valorEmAberto),
      valorPago: numeroOuNull(valorPago),
      quantidadeParcelas: numeroOuNull(quantidadeParcelas),
      quantidadeColaboradores: numeroOuNull(quantidadeColaboradores),
      cnpj: cnpj?.trim() || null,
      telefone: telefone?.trim() || null,
      telefone2: telefone2?.trim() || null,
      email: email?.trim() || null,
      sindicatoPatronal: sindicatoPatronal?.trim() || null,
      origem: origem?.trim() || null,
      observacoes: observacoes?.trim() || null,
      parcelaMaisAntiga: dataOuNull(parcelaMaisAntiga),
      parcelaMaisRecente: dataOuNull(parcelaMaisRecente),
      dataUltimoContato: dataOuNull(dataUltimoContato),
      statusPlanilha: statusPlanilha?.trim() || null,
      progresso: numeroOuNull(progresso) ?? 0,
      usuarioId: sessao.id,
    },
  });

  lead = await aplicarAutomacoes(sessao.id, lead);

  return NextResponse.json(lead, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { ids, todos } = body as { ids?: unknown; todos?: unknown };

  if (todos === true) {
    const resultado = await prisma.leadCrm.deleteMany({ where: { usuarioId: sessao.id } });
    return NextResponse.json({ excluidos: resultado.count });
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const resultado = await prisma.leadCrm.deleteMany({
      where: { usuarioId: sessao.id, id: { in: ids.filter((id): id is string => typeof id === "string") } },
    });
    return NextResponse.json({ excluidos: resultado.count });
  }

  return NextResponse.json({ error: "Informe 'ids' ou 'todos'." }, { status: 400 });
}
