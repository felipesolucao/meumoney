import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { obterSessao } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { ErroImportacao, executarImportacao } from '../../../../../lib/crmDebitosServidor';

export const maxDuration = 60;
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const registro = await prisma.importacaoDebitosCrm.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  return registro ? NextResponse.json(registro) : NextResponse.json({ error: 'Importação não encontrada.' }, { status: 404 });
}
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!['aplicar', 'desfazer'].includes(body?.acao)) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  try {
    return NextResponse.json(await executarImportacao(params.id, sessao.id, body.acao));
  } catch (e) {
    if (e instanceof ErroImportacao) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') return NextResponse.json({ error: 'Outra alteração ocorreu ao mesmo tempo. Atualize a prévia e tente novamente.' }, { status: 409 });
    return NextResponse.json({ error: 'Não foi possível concluir a operação. Consulte o histórico antes de tentar novamente.' }, { status: 500 });
  }
}
