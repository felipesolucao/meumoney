import { NextRequest, NextResponse } from 'next/server';
import { obterSessao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { validarNegociacao } from '../../../../lib/negociacoes';
import { criarNegociacao, ErroNegociacaoFunil } from '../../../../lib/negociacoesFunil';
import { contratoComoNegociacao, contratoNegociacaoInclude } from '../../../../lib/contratosNegociacoes';
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const [acordos, contratos] = await Promise.all([
    prisma.negociacaoCrm.findMany({ where: { usuarioId: sessao.id }, orderBy: [{ dataNegociacao: 'desc' }, { criadoEm: 'desc' }], include: { lead: { select: { id: true, nome: true, estagio: true } } } }),
    prisma.contrato.findMany({ where: { usuarioId: sessao.id }, include: contratoNegociacaoInclude }),
  ]);
  return NextResponse.json([...acordos, ...contratos.map(contratoComoNegociacao)].sort((a, b) => b.dataNegociacao.localeCompare(a.dataNegociacao)));
}
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  let dados;
  try { dados = validarNegociacao(await req.json()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Dados inválidos.' }, { status: 400 }); }
  try {
    const registro = await criarNegociacao(sessao.id, dados);
    return NextResponse.json(registro, { status: 201 });
  } catch (e) {
    if (e instanceof ErroNegociacaoFunil) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
