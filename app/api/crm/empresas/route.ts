import { NextRequest, NextResponse } from 'next/server';
import { obterSessao } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { pesquisarEmpresas } from '../../../../lib/negociacaoEmpresa';

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const termo = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (termo.length < 2) return NextResponse.json([]);
  // Mesmo conjunto do quadro, com projeção restrita aos dados úteis ao acordo.
  // Normalização em memória aceita CNPJ com máscara e nomes com/sem acentos.
  const empresas = await prisma.leadCrm.findMany({
    where: { usuarioId: sessao.id }, orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    select: { id: true, nome: true, cnpj: true, valorEmAberto: true, quantidadeParcelas: true, telefone: true, telefone2: true, email: true },
  });
  return NextResponse.json(pesquisarEmpresas(empresas.map(e => ({ ...e, valorEmAberto: e.valorEmAberto?.toString() ?? null })), termo).slice(0, 20));
}
