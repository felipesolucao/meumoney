import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { obterSessao } from '../../../../lib/auth';

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const pagina = Number(req.nextUrl.searchParams.get('pagina') ?? 0);
  if (!Number.isSafeInteger(pagina) || pagina < 0 || pagina > 42949672) {
    return NextResponse.json({ error: 'Página inválida.' }, { status: 400 });
  }
  const itens = await prisma.historicoCrm.findMany({
    where: { usuarioId: sessao.id, lead: { usuarioId: sessao.id } },
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], skip: pagina * 50, take: 51,
    select: { id: true, tipo: true, alteracoes: true, criadoEm: true, lead: { select: { id: true, nome: true, cnpj: true } } },
  });
  return NextResponse.json({ itens: itens.slice(0, 50).map(item => ({ ...item, responsavel: sessao.nome })), temMais: itens.length > 50 });
}
