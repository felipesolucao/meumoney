import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { registrarHistoricoCrm } from './crmHistoricoServidor';
import type { DadosNegociacao, ParcelaNegociacao } from './negociacoes';

export class ErroNegociacaoFunil extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// O acordo e o funil são gravados juntos. Serialização evita concluir uma empresa
// enquanto outro acordo dela é criado ou um pagamento é corrigido em outra aba.
export async function transacaoNegociacao<T>(executar: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    try { return await prisma.$transaction(executar, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') {
        if (tentativa < 2) continue;
        throw new ErroNegociacaoFunil('O funil foi alterado em outra operação. Tente salvar novamente.', 409);
      }
      throw e;
    }
  }
}

export async function validarEmpresaFunil(tx: Prisma.TransactionClient, usuarioId: string, leadId?: string | null) {
  if (!leadId) return;
  const lead = await tx.leadCrm.findFirst({ where: { id: leadId, usuarioId }, select: { id: true } });
  if (!lead) throw new ErroNegociacaoFunil('Empresa do funil indisponível. Pesquise e selecione a empresa novamente.', 400);
}

export async function sincronizarFunil(tx: Prisma.TransactionClient, usuarioId: string, leadId?: string | null) {
  if (!leadId) return;
  const lead = await tx.leadCrm.findFirst({ where: { id: leadId, usuarioId } });
  if (!lead) return;
  const acordos = await tx.negociacaoCrm.findMany({ where: { usuarioId, leadId }, select: { parcelas: true } });
  const contratos = await tx.contrato.findMany({ where: { usuarioId, leadId }, include: { parcelas: true } });
  const temVinculos = acordos.length + contratos.length > 0;
  const quitados = temVinculos && contratos.every(c => c.parcelas.length > 0 && c.parcelas.every(p => p.status === 'pago')) && acordos.every(n => {
    const parcelas = n.parcelas as unknown as ParcelaNegociacao[];
    return parcelas.length > 0 && parcelas.every(p => p.pagoCentavos >= p.valorCentavos);
  });
  if (lead.origem === 'Contratos') {
    const parcelas = contratos.flatMap(c => c.parcelas);
    const total = parcelas.reduce((s, p) => s + Number(p.valor), 0);
    const pago = parcelas.reduce((s, p) => s + Number(p.valorPago ?? (p.status === 'pago' ? p.valor : 0)), 0);
    await tx.leadCrm.updateMany({ where: { id: leadId, usuarioId }, data: {
      valorEmAberto: Math.max(0, total - pago), valorTotalComJuros: total, valorPago: pago,
      quantidadeParcelas: parcelas.filter(p => p.status !== 'pago').length,
    } });
  }
  // Ao remover o último vínculo, devolve apenas etapas geridas pela integração.
  if (!temVinculos && !['aguardando_pagamento', 'negociado'].includes(lead.estagio)) return;
  const estagio = !temVinculos ? 'em_negociacao' : quitados ? 'negociado' : 'aguardando_pagamento';
  if (lead.estagio === estagio) return;
  const ultima = await tx.leadCrm.aggregate({ where: { usuarioId, estagio }, _max: { ordem: true } });
  await tx.leadCrm.updateMany({ where: { id: leadId, usuarioId }, data: { estagio, ordem: (ultima._max.ordem ?? -1) + 1, movimentadoEm: new Date() } });
  await registrarHistoricoCrm(tx, usuarioId, leadId, 'Movimentação por negociação', [{ campo: 'estagio', antes: lead.estagio, depois: estagio }]);
  const motivo = !temVinculos ? 'Último vínculo de negociação removido. Empresa retornou para Em negociação.'
    : quitados ? 'Todos os contratos e acordos vinculados foram quitados. Empresa movida para Negociado.'
    : 'Negociação com saldo a receber. Empresa movida para Aguardando pagamento.';
  await tx.atendimentoCrm.create({ data: { usuarioId, leadId, observacao: motivo } });
}

export async function criarNegociacao(usuarioId: string, dados: DadosNegociacao) {
  return transacaoNegociacao(async tx => {
    await validarEmpresaFunil(tx, usuarioId, dados.leadId);
    const registro = await tx.negociacaoCrm.create({ data: { ...dados, usuarioId } });
    await sincronizarFunil(tx, usuarioId, registro.leadId);
    return registro;
  });
}

export async function alterarNegociacao(usuarioId: string, id: string, versao: number, dados?: DadosNegociacao) {
  return transacaoNegociacao(async tx => {
    const anterior = await tx.negociacaoCrm.findFirst({ where: { id, usuarioId, versao } });
    if (!anterior) throw new ErroNegociacaoFunil('Registro alterado ou indisponível. Feche a edição e atualize a lista antes de tentar novamente.', 409);
    const leadId = dados?.leadId === undefined ? anterior.leadId : dados.leadId;
    if (dados) await validarEmpresaFunil(tx, usuarioId, leadId);
    const resultado = dados
      ? await tx.negociacaoCrm.updateMany({ where: { id, usuarioId, versao }, data: { ...dados, leadId, versao: { increment: 1 } } })
      : await tx.negociacaoCrm.deleteMany({ where: { id, usuarioId, versao } });
    if (!resultado.count) throw new ErroNegociacaoFunil('Registro alterado em outra aba. Atualize a lista.', 409);
    await sincronizarFunil(tx, usuarioId, anterior.leadId);
    if (dados && leadId !== anterior.leadId) await sincronizarFunil(tx, usuarioId, leadId);
  });
}
