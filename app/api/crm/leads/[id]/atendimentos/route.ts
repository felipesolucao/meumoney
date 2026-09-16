// ============================================================================
// API: /api/crm/leads/[id]/atendimentos
// GET  -> histórico de atendimentos do lead (mais recente primeiro)
// POST -> registra um novo atendimento/observação, e atualiza
//         "dataUltimoContato" do lead quando esta é a tratativa mais recente
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { obterSessao } from "../../../../../../lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lead = await prisma.leadCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const atendimentos = await prisma.atendimentoCrm.findMany({
    where: { leadId: params.id },
    orderBy: { dataTratativa: "desc" },
  });
  return NextResponse.json(atendimentos);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const lead = await prisma.leadCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const body = await req.json();
  const { observacao, tentativaNumero, dataTratativa } = body;

  if (!observacao || !String(observacao).trim()) {
    return NextResponse.json({ error: "Descreva o atendimento." }, { status: 400 });
  }

  const dataFinal = dataTratativa ? new Date(dataTratativa) : new Date();
  if (Number.isNaN(dataFinal.getTime())) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }

  const atendimento = await prisma.atendimentoCrm.create({
    data: {
      observacao: String(observacao).trim(),
      tentativaNumero: tentativaNumero !== undefined && tentativaNumero !== null && tentativaNumero !== "" ? Number(tentativaNumero) : null,
      dataTratativa: dataFinal,
      leadId: params.id,
      usuarioId: sessao.id,
    },
  });

  // Mantém "dataUltimoContato" do lead sempre igual à tratativa mais recente
  // registrada — é o que aparece no card e alimenta filtros/automação futura.
  if (!lead.dataUltimoContato || dataFinal > lead.dataUltimoContato) {
    await prisma.leadCrm.update({ where: { id: lead.id }, data: { dataUltimoContato: dataFinal } });
  }

  return NextResponse.json(atendimento, { status: 201 });
}
