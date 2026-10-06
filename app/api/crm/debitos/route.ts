import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { obterSessao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { lerPlanilhaDebitos } from '../../../../lib/crmDebitosExcel';
import { conciliarDebitos } from '../../../../lib/crmDebitos';
import { fingerprintLeads, serializarLeadDebito } from '../../../../lib/crmDebitosServidor';
import { mesclarEstagiosConfig } from '../../../../lib/crm';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const historico = await prisma.importacaoDebitosCrm.findMany({ where: { usuarioId: sessao.id }, orderBy: { criadoEm: 'desc' }, take: 20,
    select: { id: true, arquivo: true, criadoEm: true, aplicadoEm: true, desfeitoEm: true } });
  return NextResponse.json(historico);
}
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (Number(req.headers.get('content-length')) > 11 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo excede 10 MB.' }, { status: 413 });
  let planilha, arquivo: File, estagios: string[];
  try {
    const form = await req.formData();
    const enviado = form.get('arquivo');
    // FormData retorna string, File ou null; não depende do global File (ausente no Node 18).
    if (!enviado || typeof enviado === 'string' || !enviado.name.toLowerCase().endsWith('.xlsx') || !enviado.size || enviado.size > 10 * 1024 * 1024) throw new Error('Selecione um arquivo .xlsx de até 10 MB.');
    arquivo = enviado;
    const escopo: unknown = JSON.parse(String(form.get('estagios')));
    if (!Array.isArray(escopo) || !escopo.length || !escopo.every(e => typeof e === 'string')) throw new Error('Selecione os grupos que pertencem à listagem importada.');
    estagios = [...new Set(escopo)] as string[];
    planilha = await lerPlanilhaDebitos(Buffer.from(await arquivo.arrayBuffer()));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Não foi possível ler a planilha.' }, { status: 400 });
  }
  const validos = mesclarEstagiosConfig(await prisma.estagioCrmConfig.findMany({ where: { usuarioId: sessao.id } }));
  if (estagios.some(e => !validos.some(v => v.id === e))) return NextResponse.json({ error: 'Grupo inválido.' }, { status: 400 });
  const leads = (await prisma.leadCrm.findMany({ where: { usuarioId: sessao.id, estagio: { in: estagios } } })).map(serializarLeadDebito);
  const relatorio = { aba: planilha.aba, linhas: planilha.linhas, empresas: planilha.empresas.length, estagios,
    ...conciliarDebitos(planilha.empresas, leads) };
  const importacao = await prisma.importacaoDebitosCrm.create({ data: { usuarioId: sessao.id, arquivo: arquivo.name.slice(0, 255),
    fingerprint: fingerprintLeads(leads), relatorio: relatorio as unknown as Prisma.InputJsonValue } });
  return NextResponse.json(importacao);
}
