// ============================================================================
// API: /api/crm/leads
// GET  -> lista todos os leads DO USUÁRIO LOGADO (para montar o quadro)
// POST -> cria um novo lead, sempre no topo da coluna "1ª tentativa"
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { ESTAGIOS_IDS } from "../../../../lib/crm";

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

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const {
    nome, estagio, valorEmAberto, quantidadeParcelas, quantidadeColaboradores,
    cnpj, telefone, telefone2, email, sindicatoPatronal, origem, observacoes,
  } = body;

  if (!nome || !String(nome).trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const estagioFinal = ESTAGIOS_IDS.includes(estagio) ? estagio : "primeira_tentativa";

  // Novo card entra no topo da coluna — todos os outros descem uma posição.
  await prisma.leadCrm.updateMany({
    where: { usuarioId: sessao.id, estagio: estagioFinal },
    data: { ordem: { increment: 1 } },
  });

  const lead = await prisma.leadCrm.create({
    data: {
      nome: String(nome).trim(),
      estagio: estagioFinal,
      ordem: 0,
      valorEmAberto: numeroOuNull(valorEmAberto),
      quantidadeParcelas: numeroOuNull(quantidadeParcelas),
      quantidadeColaboradores: numeroOuNull(quantidadeColaboradores),
      cnpj: cnpj?.trim() || null,
      telefone: telefone?.trim() || null,
      telefone2: telefone2?.trim() || null,
      email: email?.trim() || null,
      sindicatoPatronal: sindicatoPatronal?.trim() || null,
      origem: origem?.trim() || null,
      observacoes: observacoes?.trim() || null,
      usuarioId: sessao.id,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
