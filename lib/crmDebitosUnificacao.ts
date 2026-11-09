import { createHash } from 'node:crypto';
import { Prisma, type LeadCrm } from '@prisma/client';

type Vinculo = { id: string; fingerprint: string };
export type BackupDuplicado = {
  cadastro: Record<string, unknown>;
  destino: string;
  atendimentos: Vinculo[]; negociacoes: Vinculo[]; contratos: Vinculo[]; historico: Vinculo[];
};
const hash = (valor: unknown) => createHash('sha256').update(JSON.stringify(valor)).digest('hex');
const vinculos = (registros: { id: string }[]) => registros.map(r => ({ id: r.id, fingerprint: hash(r) }));

export async function unificarCadastro(tx: Prisma.TransactionClient, usuarioId: string, origem: LeadCrm, destino: string): Promise<BackupDuplicado> {
  const where = { usuarioId, leadId: origem.id };
  // Mova relações antes de remover o cartão: atendimento/anexo e auditoria têm cascade.
  const atendimentos = await tx.atendimentoCrm.findMany({ where });
  const negociacoes = await tx.negociacaoCrm.findMany({ where });
  const contratos = await tx.contrato.findMany({ where });
  const historico = await tx.historicoCrm.findMany({ where });
  await tx.atendimentoCrm.updateMany({ where, data: { leadId: destino } });
  await tx.negociacaoCrm.updateMany({ where, data: { leadId: destino } });
  await tx.contrato.updateMany({ where, data: { leadId: destino } });
  await tx.historicoCrm.updateMany({ where, data: { leadId: destino } });
  const movidos = (rs: { id: string }[]) => ({ usuarioId, leadId: destino, id: { in: rs.map(r => r.id) } });
  const backup: BackupDuplicado = {
    cadastro: JSON.parse(JSON.stringify(origem)), destino,
    atendimentos: vinculos(await tx.atendimentoCrm.findMany({ where: movidos(atendimentos) })),
    negociacoes: vinculos(await tx.negociacaoCrm.findMany({ where: movidos(negociacoes) })),
    contratos: vinculos(await tx.contrato.findMany({ where: movidos(contratos) })),
    historico: vinculos(await tx.historicoCrm.findMany({ where: movidos(historico) })),
  };
  await tx.leadCrm.delete({ where: { id: origem.id, usuarioId } });
  return backup;
}

export async function restaurarCadastro(tx: Prisma.TransactionClient, usuarioId: string, b: BackupDuplicado) {
  if (b.cadastro.usuarioId !== usuarioId) throw new Error('Backup pertence a outra conta.');
  const where = (rs: Vinculo[]) => ({ usuarioId, leadId: b.destino, id: { in: rs.map(r => r.id) } });
  const conferir = (antes: Vinculo[], depois: { id: string }[]) => {
    const atuais = new Map(vinculos(depois).map(r => [r.id, r.fingerprint]));
    if (antes.length !== depois.length || antes.some(r => atuais.get(r.id) !== r.fingerprint)) {
      throw new Error('Um vínculo da empresa unificada mudou. Nenhuma alteração foi salva.');
    }
  };
  conferir(b.atendimentos, await tx.atendimentoCrm.findMany({ where: where(b.atendimentos) }));
  conferir(b.negociacoes, await tx.negociacaoCrm.findMany({ where: where(b.negociacoes) }));
  conferir(b.contratos, await tx.contrato.findMany({ where: where(b.contratos) }));
  conferir(b.historico, await tx.historicoCrm.findMany({ where: where(b.historico) }));
  // Datas ISO e decimais serializados são aceitos pelo Prisma; JSON nulo precisa do sentinel.
  const dados = { ...b.cadastro, camposExtras: b.cadastro.camposExtras ?? Prisma.DbNull } as Prisma.LeadCrmUncheckedCreateInput;
  await tx.leadCrm.create({ data: dados });
  const data = { leadId: String(b.cadastro.id) };
  await tx.atendimentoCrm.updateMany({ where: where(b.atendimentos), data });
  await tx.negociacaoCrm.updateMany({ where: where(b.negociacoes), data });
  await tx.contrato.updateMany({ where: where(b.contratos), data });
  await tx.historicoCrm.updateMany({ where: where(b.historico), data });
}
