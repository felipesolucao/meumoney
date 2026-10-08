import type { Prisma } from '@prisma/client';
import type { Negociacao } from './negociacoes';
import { sincronizarFunil } from './negociacoesFunil';

export const contratoNegociacaoInclude = {
  cliente: true, lead: { select: { id: true, nome: true, estagio: true } },
  parcelas: { orderBy: { numero: 'asc' as const } },
};
type ContratoIntegrado = Prisma.ContratoGetPayload<{ include: typeof contratoNegociacaoInclude }>;

// Uma projeção das parcelas reais: não cria cópias de recebimentos no CRM.
export function contratoComoNegociacao(c: ContratoIntegrado): Negociacao {
  const parcelas = c.parcelas.map(p => ({
    numero: p.numero, valorCentavos: Math.round(Number(p.valor) * 100),
    pagoCentavos: Math.round(Number(p.valorPago ?? (p.status === 'pago' ? p.valor : 0)) * 100),
    vencimento: p.vencimento.toISOString().slice(0, 10),
    dataPagamento: p.pagoEm?.toISOString().slice(0, 10) ?? '', situacao: 'aguardando' as const,
  }));
  return {
    id: `contrato:${c.id}`, contratoId: c.id, codigoContrato: c.codigo, clienteId: c.clienteId,
    versao: 1, leadId: c.leadId, lead: c.lead, empresa: c.cliente.nome,
    cnpj: (c.cliente.cpf ?? '').replace(/\D/g, ''), tipo: parcelas.length === 1 ? 'avista' : 'parcelada',
    dataNegociacao: c.criadoEm.toISOString().slice(0, 10), debitoCentavos: Math.round(Number(c.valorEmprestado) * 100),
    totalCentavos: parcelas.reduce((s, p) => s + p.valorCentavos, 0), parcelasOriginais: parcelas.length,
    observacoes: `Contrato ${c.codigo}`, parcelas,
  };
}

export async function vincularContratoFunil(tx: Prisma.TransactionClient, usuarioId: string, contratoId: string) {
  const contrato = await tx.contrato.findFirst({ where: { id: contratoId, usuarioId }, include: { cliente: true } });
  if (!contrato) return;
  let leadId = contrato.leadId;
  if (!leadId) {
    const irmao = await tx.contrato.findFirst({ where: { usuarioId, clienteId: contrato.clienteId, leadId: { not: null } } });
    leadId = irmao?.leadId ?? null;
    if (!leadId) {
      const documento = (contrato.cliente.cpf ?? '').replace(/\D/g, '');
      // Não vincula por nome: homônimos e documentos ambíguos precisam permanecer separados.
      const candidatos = documento.length === 14 ? (await tx.leadCrm.findMany({ where: { usuarioId }, select: { id: true, cnpj: true } }))
        .filter(l => l.cnpj?.replace(/\D/g, '') === documento) : [];
      if (candidatos.length === 1) leadId = candidatos[0].id;
      else {
        const lead = await tx.leadCrm.create({ data: {
          usuarioId, nome: contrato.cliente.nome, cnpj: documento.length === 14 ? documento : null,
          telefone: contrato.cliente.telefone, email: contrato.cliente.email,
          origem: 'Contratos', estagio: 'aguardando_pagamento',
        } });
        leadId = lead.id;
      }
    }
    await tx.contrato.update({ where: { id: contrato.id }, data: { leadId } });
  }
  await sincronizarFunil(tx, usuarioId, leadId);
}

export async function atualizarStatusContrato(tx: Prisma.TransactionClient, usuarioId: string, contratoId: string) {
  const c = await tx.contrato.findFirst({ where: { id: contratoId, usuarioId }, include: { parcelas: true } });
  if (!c) return;
  const hoje = new Date(new Date().toDateString());
  const status = c.parcelas.length > 0 && c.parcelas.every(p => p.status === 'pago') ? 'quitado'
    : c.parcelas.some(p => p.status !== 'pago' && p.vencimento < hoje) ? 'atrasado' : 'em_dia';
  await tx.contrato.update({ where: { id: c.id }, data: { status } });
  await vincularContratoFunil(tx, usuarioId, c.id);
}
