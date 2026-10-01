import { NextRequest, NextResponse } from 'next/server';
import { obterSessao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { validarNegociacao } from '../../../../lib/negociacoes';
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  return NextResponse.json(await prisma.negociacaoCrm.findMany({ where: { usuarioId: sessao.id }, orderBy: [{ dataNegociacao: 'desc' }, { criadoEm: 'desc' }] }));
}
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  let dados;
  try { dados = validarNegociacao(await req.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Dados inválidos.' }, { status: 400 }); }
  const registro = await prisma.negociacaoCrm.create({ data: { ...dados, usuarioId: sessao.id } });
  return NextResponse.json(registro, { status: 201 });
}
