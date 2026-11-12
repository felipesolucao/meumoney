import { transacaoNegociacao } from './negociacoesFunil';

// Desvincular antes de excluir protege os acordos sem alterar seus dados
// financeiros. A transação impede uma limpeza parcial em caso de falha.
export async function excluirLeadsPreservandoNegociacoes(usuarioId: string, ids?: string[]) {
  return transacaoNegociacao(async tx => {
    const where = { usuarioId, ...(ids === undefined ? {} : { id: { in: ids } }) };
    const vinculos = { usuarioId, lead: { is: where } };
    await tx.negociacaoCrm.updateMany({
      where: vinculos,
      data: { leadId: null, versao: { increment: 1 } },
    });
    await tx.contrato.updateMany({ where: vinculos, data: { leadId: null } });
    return tx.leadCrm.deleteMany({ where });
  });
}
