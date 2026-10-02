import { NextRequest, NextResponse } from 'next/server';
import { obterSessao } from '../../../../../lib/auth';
import { alterarNegociacao, ErroNegociacaoFunil } from '../../../../../lib/negociacoesFunil';
import { validarNegociacao } from '../../../../../lib/negociacoes';
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  let dados; let versao: number;
  try {
    const body = await req.json();
    dados = validarNegociacao(body);
    versao = body.versao;
    if (!Number.isSafeInteger(versao) || versao < 1) throw new Error('Versão inválida.');
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Dados inválidos.' }, { status: 400 }); }
  return gravar(sessao.id, params.id, versao, dados);
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const versao = Number(req.nextUrl.searchParams.get('versao'));
  if (!Number.isSafeInteger(versao) || versao < 1) return NextResponse.json({ error: 'Versão inválida.' }, { status: 400 });
  return gravar(sessao.id, params.id, versao);
}
async function gravar(usuarioId: string, id: string, versao: number, dados?: ReturnType<typeof validarNegociacao>) {
  try {
    await alterarNegociacao(usuarioId, id, versao, dados);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErroNegociacaoFunil) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
