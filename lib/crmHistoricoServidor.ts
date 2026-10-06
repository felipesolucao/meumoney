import type { Prisma } from '@prisma/client';
import { compararCamposCrm, type AlteracaoCrm } from './crmHistorico';

export async function registrarHistoricoCrm(tx: Prisma.TransactionClient, usuarioId: string, leadId: string, tipo: string, alteracoes: AlteracaoCrm[]) {
  if (!alteracoes.length) return;
  await tx.historicoCrm.create({ data: { usuarioId, leadId, tipo, alteracoes } });
}

export async function registrarAtendimentoCrm(tx: Prisma.TransactionClient, usuarioId: string, leadId: string, tipo: string, antes: Record<string, unknown>, depois: Record<string, unknown>) {
  const alteracoes = compararCamposCrm(antes, depois);
  if (!alteracoes.length) return;
  const dados: { movimentadoEm: Date; dataUltimoContato?: Date | null } = { movimentadoEm: new Date() };
  if (alteracoes.some(a => a.campo === 'dataTratativa')) {
    const ultimo = await tx.atendimentoCrm.findFirst({ where: { leadId, usuarioId }, orderBy: { dataTratativa: 'desc' }, select: { dataTratativa: true } });
    const lead = await tx.leadCrm.findUniqueOrThrow({ where: { id: leadId, usuarioId } });
    // Um atendimento retroativo não substitui um contato manual mais recente.
    if (antes.dataTratativa != null || !lead.dataUltimoContato || (ultimo && ultimo.dataTratativa > lead.dataUltimoContato)) {
      dados.dataUltimoContato = ultimo?.dataTratativa ?? null;
    }
  }
  await tx.leadCrm.update({ where: { id: leadId, usuarioId }, data: dados });
  await registrarHistoricoCrm(tx, usuarioId, leadId, tipo, alteracoes);
}
