import { createHash } from 'node:crypto';
import { Prisma, type LeadCrm } from '@prisma/client';
import { prisma } from './prisma';
import { somenteDebito, type Debito, type LeadDebito, type RelatorioDebitos } from './crmDebitos';

export function serializarLeadDebito(l: LeadCrm): LeadDebito {
  return { id: l.id, nome: l.nome, codigo: l.codigo ?? '', cnpj: l.cnpj ?? '', estagio: l.estagio,
    atualizadoEm: l.atualizadoEm.toISOString(), valorEmAberto: l.valorEmAberto?.toFixed(2) ?? null,
    quantidadeParcelas: l.quantidadeParcelas, parcelaMaisAntiga: l.parcelaMaisAntiga?.toISOString() ?? null,
    parcelaMaisRecente: l.parcelaMaisRecente?.toISOString() ?? null };
}
export function fingerprintLeads(leads: LeadDebito[]): string {
  return createHash('sha256').update(JSON.stringify([...leads].sort((a, b) => a.id.localeCompare(b.id)).map(l => [l.id, l.atualizadoEm, l.nome, l.codigo, l.cnpj, l.estagio, l.valorEmAberto, l.quantidadeParcelas, l.parcelaMaisAntiga, l.parcelaMaisRecente]))).digest('hex');
}
function dadosDebito(d: Debito) {
  return { valorEmAberto: d.valorEmAberto, quantidadeParcelas: d.quantidadeParcelas,
    parcelaMaisAntiga: d.parcelaMaisAntiga ? new Date(d.parcelaMaisAntiga) : null,
    parcelaMaisRecente: d.parcelaMaisRecente ? new Date(d.parcelaMaisRecente) : null };
}
export class ErroImportacao extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export async function executarImportacao(id: string, usuarioId: string, acao: 'aplicar' | 'desfazer') {
  // Confirmação e reversão são atômicas e verificam concorrência; jamais aplicam um lote parcialmente.
  return prisma.$transaction(async tx => {
    const importacao = await tx.importacaoDebitosCrm.findFirst({ where: { id, usuarioId } });
    if (!importacao) throw new ErroImportacao('Importação não encontrada.', 404);
    const relatorio = importacao.relatorio as unknown as RelatorioDebitos;
    if (acao === 'aplicar') {
      if (importacao.desfeitoEm) throw new ErroImportacao('Importação já desfeita. Gere uma nova prévia.');
      if (importacao.aplicadoEm) return importacao; // Reenvio após perda de conexão não reaplica.
      if (Date.now() - importacao.criadoEm.getTime() > 86400000) throw new ErroImportacao('Prévia expirada. Analise o arquivo novamente.');
      const leads = await tx.leadCrm.findMany({ where: { usuarioId, estagio: { in: relatorio.estagios } } });
      if (fingerprintLeads(leads.map(serializarLeadDebito)) !== importacao.fingerprint) throw new ErroImportacao('O funil mudou desde a prévia. Analise novamente antes de atualizar.');
    } else {
      if (importacao.desfeitoEm) return importacao;
      if (!importacao.aplicadoEm) throw new ErroImportacao('Esta importação ainda não foi aplicada.');
    }
    for (const a of relatorio.atualizacoes) {
      const resultado = await tx.leadCrm.updateMany({
        where: { id: a.lead.id, usuarioId, ...(acao === 'desfazer' ? { ...dadosDebito(a.depois), atualizadoEm: new Date(a.atualizadoEmDepois ?? '') } : { atualizadoEm: new Date(a.lead.atualizadoEm) }) },
        data: dadosDebito(acao === 'aplicar' ? a.depois : somenteDebito(a.lead)),
      });
      if (resultado.count !== 1) throw new ErroImportacao('Um cadastro foi alterado ou removido após a importação. Nenhuma alteração deste lote foi salva.');
      if (acao === 'aplicar') {
        const salvo = await tx.leadCrm.findUniqueOrThrow({ where: { id: a.lead.id }, select: { atualizadoEm: true } });
        a.atualizadoEmDepois = salvo.atualizadoEm.toISOString();
      }
    }
    return tx.importacaoDebitosCrm.update({ where: { id }, data: acao === 'aplicar' ? { aplicadoEm: new Date(), relatorio: relatorio as unknown as Prisma.InputJsonValue } : { desfeitoEm: new Date() } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
}
