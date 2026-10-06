import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { obterSessao } from '../../../../../../lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const lead = await prisma.leadCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
  const pagina = Number(req.nextUrl.searchParams.get('pagina') ?? 0);
  if (!Number.isSafeInteger(pagina) || pagina < 0) return NextResponse.json({ error: 'Página inválida.' }, { status: 400 });
  const itens = await prisma.historicoCrm.findMany({
    where: { leadId: params.id, usuarioId: sessao.id },
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], skip: pagina * 50, take: 51,
    select: { id: true, tipo: true, alteracoes: true, criadoEm: true },
  });
  return NextResponse.json({ itens: itens.slice(0, 50).map(item => ({ ...item, responsavel: sessao.nome })), temMais: itens.length > 50 });
}
