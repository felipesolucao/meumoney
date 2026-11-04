import { NextRequest, NextResponse } from 'next/server';
import { obterSessao } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { mesmaEmpresa, snapshotImportado, recuperarDuplicadas, type SnapshotImportado } from '../../../../../lib/crmImportacoesServidor';
import { ErroImportacao } from '../../../../../lib/crmDebitosServidor';

export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const inicio = new Date(req.nextUrl.searchParams.get('inicio') ?? '');
  const fim = new Date(req.nextUrl.searchParams.get('fim') ?? '');
  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fim.getTime()) || inicio > fim || fim.getTime() - inicio.getTime() > 7 * 86400000) {
    return NextResponse.json({ error: 'Informe um intervalo válido de até 7 dias.' }, { status: 400 });
  }
  const [todos, lotes] = await Promise.all([
    prisma.leadCrm.findMany({ where: { usuarioId: sessao.id }, orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }], include: { _count: { select: { atendimentos: true, negociacoes: true, contratos: true } } } }),
    prisma.importacaoLeadsCrm.findMany({ where: { usuarioId: sessao.id }, select: { registros: true } }),
  ]);
  const rastreados = new Set(lotes.flatMap(l => (l.registros as SnapshotImportado[]).map(r => r.id)));
  const itens = todos.filter(l => l.criadoEm >= inicio && l.criadoEm <= fim && !rastreados.has(l.id)).flatMap(lead => {
    const anterior = todos.find(a => a.criadoEm < lead.criadoEm && mesmaEmpresa(lead, a));
    if (!anterior) return [];
    const { _count, ...dados } = lead;
    return [{ ...snapshotImportado(dados), nome: lead.nome, cnpj: lead.cnpj, codigo: lead.codigo, criadoEm: lead.criadoEm,
      anterior: { id: anterior.id, nome: anterior.nome, criadoEm: anterior.criadoEm },
      bloqueada: Object.values(_count).some(n => n > 0) }];
  });
  return NextResponse.json({ itens });
}
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const registros = body?.registros;
  if (!Array.isArray(registros) || !registros.length || registros.length > 20000 || registros.some(r => !r || typeof r.id !== 'string' || typeof r.atualizadoEm !== 'string' || typeof r.fingerprint !== 'string') || new Set(registros.map(r => r.id)).size !== registros.length) {
    return NextResponse.json({ error: 'Selecione as duplicatas que deseja remover.' }, { status: 400 });
  }
  try { return NextResponse.json(await recuperarDuplicadas(sessao.id, registros)); }
  catch (e) {
    return NextResponse.json({ error: e instanceof ErroImportacao ? e.message : 'Não foi possível concluir. Consulte o histórico e atualize a consulta.' }, { status: e instanceof ErroImportacao ? e.status : 409 });
  }
}
