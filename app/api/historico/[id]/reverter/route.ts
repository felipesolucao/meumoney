// ============================================================================
// API: /api/historico/[id]/reverter
// POST -> desfaz a ação registrada, restaurando o snapshot "antes" (ou
//         apagando/recriando o registro, dependendo do tipo de ação original).
// ----------------------------------------------------------------------------
// Nunca apaga a linha do histórico: marca ela como revertida e cria uma nova
// entrada do tipo "REVERSAO", para manter o rastro completo (ver lib/historico.ts).
// ============================================================================
import { NextResponse } from "next/server";
import { obterSessao } from "../../../../../lib/auth";
import { reverterAcao } from "../../../../../lib/historico";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const resultado = await reverterAcao(sessao.id, params.id);

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
