// ============================================================================
// CRM — aplicação das regras de automação (server-only)
// ----------------------------------------------------------------------------
// Separado de lib/crm.ts (que é importado por client components) porque aqui
// entra o Prisma Client, que só pode rodar no servidor. A lógica pura de
// "qual regra bate" mora em lib/crm.ts (encontrarEstagioAutomatico).
// ============================================================================
import { EstagioLeadCrm, LeadCrm } from "@prisma/client";
import { prisma } from "./prisma";
import { encontrarEstagioAutomatico, type RegraAutomacaoCrm } from "./crm";

// Chamado depois de criar/editar/importar um lead — se alguma automação
// ativa bater com o status/progresso atual dele, move para o estágio
// definido pela regra (sempre para o fim da coluna destino) e reinicia o
// contador de "sem movimento".
export async function aplicarAutomacoes(usuarioId: string, lead: LeadCrm): Promise<LeadCrm> {
  const regras = await prisma.automacaoCrm.findMany({ where: { usuarioId, ativo: true }, orderBy: { ordem: "asc" } });
  if (regras.length === 0) return lead;

  const regrasConvertidas: RegraAutomacaoCrm[] = regras.map((r) => ({
    id: r.id,
    nome: r.nome,
    ativo: r.ativo,
    ordem: r.ordem,
    statusPlanilha: r.statusPlanilha,
    progressoMin: r.progressoMin,
    progressoMax: r.progressoMax,
    estagioDestino: r.estagioDestino,
  }));

  const novoEstagio = encontrarEstagioAutomatico(regrasConvertidas, {
    statusPlanilha: lead.statusPlanilha,
    progresso: lead.progresso,
    estagio: lead.estagio,
  }) as EstagioLeadCrm | null;

  if (!novoEstagio) return lead;

  const totalNaColuna = await prisma.leadCrm.count({ where: { usuarioId, estagio: novoEstagio } });
  return prisma.leadCrm.update({
    where: { id: lead.id },
    data: { estagio: novoEstagio, ordem: totalNaColuna, movimentadoEm: new Date() },
  });
}
