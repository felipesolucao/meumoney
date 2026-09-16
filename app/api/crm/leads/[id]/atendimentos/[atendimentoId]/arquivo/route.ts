// ============================================================================
// API: /api/crm/leads/[id]/atendimentos/[atendimentoId]/arquivo
// GET -> baixa o anexo de um atendimento (o binário nunca vai na listagem,
//        só é lido do banco aqui, quando o usuário efetivamente clica em
//        baixar — ver AtendimentosHistorico.tsx)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../../lib/prisma";
import { obterSessao } from "../../../../../../../../lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string; atendimentoId: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const atendimento = await prisma.atendimentoCrm.findFirst({
    where: { id: params.atendimentoId, leadId: params.id, usuarioId: sessao.id, lead: { usuarioId: sessao.id } },
    select: { arquivoNome: true, arquivoTipo: true, arquivoDados: true },
  });
  if (!atendimento?.arquivoDados) return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });

  return new NextResponse(new Uint8Array(atendimento.arquivoDados), {
    headers: {
      "Content-Type": atendimento.arquivoTipo || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${(atendimento.arquivoNome || "anexo").replace(/"/g, "")}"`,
    },
  });
}
