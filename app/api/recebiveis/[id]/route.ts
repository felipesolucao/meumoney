import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const selecionado = await prisma.lancamento.findFirst({
    where: { id: params.id, usuarioId: sessao.id, tipo: "receita" },
    include: { categoria: true, conta: true, recorrente: true },
  });
  if (!selecionado) return NextResponse.json({ error: "Recebível não encontrado." }, { status: 404 });
  const ocorrencias = selecionado.recorrenteId ? await prisma.lancamento.findMany({
    where: { recorrenteId: selecionado.recorrenteId, usuarioId: sessao.id, tipo: "receita" },
    include: { categoria: true, conta: true }, orderBy: [{ dataVencimento: "asc" }, { numeroParcela: "asc" }, { id: "asc" }],
  }) : [selecionado];
  return NextResponse.json({ selecionado, ocorrencias, recorrencia: selecionado.recorrente }, { headers: { "Cache-Control": "no-store" } });
}
