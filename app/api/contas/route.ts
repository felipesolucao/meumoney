// ============================================================================
// API: /api/contas
// GET  -> lista as contas/carteiras DO USUÁRIO LOGADO (ex: Nubank, Infinitypay)
// POST -> cria uma nova conta/carteira, vinculada ao usuário logado
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const contas = await prisma.conta.findMany({ where: { usuarioId: sessao.id }, orderBy: { nome: "asc" } });
  return NextResponse.json(contas);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const { nome, icone, saldoInicial } = body as { nome: string; icone?: string; saldoInicial?: number };

  if (!nome) {
    return NextResponse.json({ error: "Informe o nome da conta." }, { status: 400 });
  }

  const conta = await prisma.conta.create({
    data: {
      nome,
      icone: icone || undefined,
      saldoInicial: saldoInicial != null ? Number(saldoInicial) : undefined,
      usuarioId: sessao.id,
    },
  });
  return NextResponse.json(conta, { status: 201 });
}
