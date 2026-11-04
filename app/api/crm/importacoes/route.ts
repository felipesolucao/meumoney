import { NextRequest, NextResponse } from 'next/server';
import { obterSessao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const pagina = Number(req.nextUrl.searchParams.get('pagina') ?? 0);
  if (!Number.isSafeInteger(pagina) || pagina < 0 || pagina > 1000000) return NextResponse.json({ error: 'Página inválida.' }, { status: 400 });
  const take = (pagina + 1) * 30 + 1;
  const [leads, debitos] = await Promise.all([
    prisma.importacaoLeadsCrm.findMany({ where: { usuarioId: sessao.id }, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], take, select: { id: true, arquivo: true, quantidade: true, criadoEm: true, desfeitoEm: true } }),
    prisma.importacaoDebitosCrm.findMany({ where: { usuarioId: sessao.id }, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], take, select: { id: true, arquivo: true, criadoEm: true, aplicadoEm: true, desfeitoEm: true } }),
  ]);
  const itens = [...leads.map(l => ({ ...l, tipo: 'leads' as const, aplicadoEm: l.criadoEm })), ...debitos.map(d => ({ ...d, tipo: 'debitos' as const }))]
    .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime() || b.id.localeCompare(a.id));
  return NextResponse.json({ itens: itens.slice(pagina * 30, (pagina + 1) * 30), temMais: itens.length > (pagina + 1) * 30 });
}
