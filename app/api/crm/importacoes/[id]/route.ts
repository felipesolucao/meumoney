import { NextRequest, NextResponse } from 'next/server';
import { obterSessao } from '../../../../../lib/auth';
import { desfazerImportacaoLeads } from '../../../../../lib/crmImportacoesServidor';
import { ErroImportacao } from '../../../../../lib/crmDebitosServidor';

export const maxDuration = 60;
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.acao !== 'desfazer') return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  try { return NextResponse.json(await desfazerImportacaoLeads(params.id, sessao.id)); }
  catch (e) {
    return NextResponse.json({ error: e instanceof ErroImportacao ? e.message : 'Não foi possível desfazer. Atualize o histórico antes de tentar novamente.' }, { status: e instanceof ErroImportacao ? e.status : 409 });
  }
}
