import { NextRequest, NextResponse } from 'next/server';
import { obterSessao } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
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
  const resultado = await prisma.negociacaoCrm.updateMany({ where: { id: params.id, usuarioId: sessao.id, versao }, data: { ...dados, versao: { increment: 1 } } });
  if (!resultado.count) return NextResponse.json({ error: 'Registro alterado ou indisponível. Feche a edição e atualize a lista antes de tentar novamente.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const versao = Number(req.nextUrl.searchParams.get('versao'));
  if (!Number.isSafeInteger(versao) || versao < 1) return NextResponse.json({ error: 'Versão inválida.' }, { status: 400 });
  const resultado = await prisma.negociacaoCrm.deleteMany({ where: { id: params.id, usuarioId: sessao.id, versao } });
  return NextResponse.json(resultado.count ? { ok: true } : { error: 'Registro alterado ou indisponível. Atualize a lista.' }, { status: resultado.count ? 200 : 409 });
}
