// ============================================================================
// API: /api/cartoes/[id]/faturas?ano=2026&mes=8   (mes 0-11)
// GET -> a fatura daquele cartão na competência pedida, já com as compras
//        lançadas nela (mais recente primeiro). Cria a fatura na hora se o
//        usuário navegar pra um mês em que ela ainda não existe (ver
//        obterOuCriarFatura em lib/cartao.ts) — a tela de extrato do cartão
//        usa isso pra navegar entre meses com o mesmo MesSeletor de sempre.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { fecharFaturasVencidas, obterOuCriarFatura } from "../../../../../lib/cartao";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const cartao = await prisma.cartaoCredito.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!cartao) return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });

  await fecharFaturasVencidas(sessao.id);

  const ano = Number(req.nextUrl.searchParams.get("ano"));
  const mes = Number(req.nextUrl.searchParams.get("mes"));
  if (Number.isNaN(ano) || Number.isNaN(mes)) {
    return NextResponse.json({ error: "Informe ano e mes." }, { status: 400 });
  }

  const faturaBase = await obterOuCriarFatura(prisma, cartao, ano, mes);
  const fatura = await prisma.faturaCartao.findUnique({
    where: { id: faturaBase.id },
    include: { compras: { include: { categoria: true }, orderBy: { dataCompra: "desc" } } },
  });

  return NextResponse.json({ cartao, fatura });
}
