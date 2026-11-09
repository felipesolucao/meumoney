import { unificarCadastro, restaurarCadastro, type BackupDuplicado } from './crmDebitosUnificacao';
import { createHash } from 'node:crypto';
import { Prisma, type LeadCrm } from '@prisma/client';
import { prisma } from './prisma';
import { compararCamposCrm } from './crmHistorico';
import { registrarHistoricoCrm } from './crmHistoricoServidor';
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
    const relatorio = importacao.relatorio as unknown as RelatorioDebitos & { backupsDuplicados?: BackupDuplicado[] };
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
    if (acao === 'desfazer') {
      for (const backup of relatorio.backupsDuplicados ?? []) {
        try { await restaurarCadastro(tx, usuarioId, backup); }
        catch { throw new ErroImportacao('Não foi possível restaurar as duplicatas: um cadastro ou vínculo mudou. Nenhuma alteração foi salva.'); }
      }
    }
    for (const a of relatorio.atualizacoes) {
      if (acao === 'aplicar') {
        for (const duplicado of a.duplicados ?? []) {
          const origem = await tx.leadCrm.findUniqueOrThrow({ where: { id: duplicado.id, usuarioId } });
          if (origem.atualizadoEm.toISOString() !== duplicado.atualizadoEm || origem.estagio !== a.lead.estagio) throw new ErroImportacao('Uma duplicata mudou. Analise novamente.');
          (relatorio.backupsDuplicados ??= []).push(await unificarCadastro(tx, usuarioId, origem, a.lead.id));
        }
      }
      const resultado = await tx.leadCrm.updateMany({
        where: { id: a.lead.id, usuarioId, ...(acao === 'desfazer' ? { ...dadosDebito(a.depois), ...((a.duplicados?.length ?? 0) > 0 ? { atualizadoEm: new Date(a.atualizadoEmDepois ?? '') } : {}) } : { atualizadoEm: new Date(a.lead.atualizadoEm) }) },
        data: { ...dadosDebito(acao === 'aplicar' ? a.depois : somenteDebito(a.lead)), movimentadoEm: new Date() },
      });
      if (resultado.count !== 1) throw new ErroImportacao('Um cadastro foi alterado ou removido após a importação. Nenhuma alteração deste lote foi salva.');
      await registrarHistoricoCrm(tx, usuarioId, a.lead.id, acao === 'aplicar' ? 'Débitos atualizados por importação' : 'Importação de débitos desfeita', compararCamposCrm(dadosDebito(acao === 'aplicar' ? somenteDebito(a.lead) : a.depois), dadosDebito(acao === 'aplicar' ? a.depois : somenteDebito(a.lead))));
      if (acao === 'aplicar') {
        const salvo = await tx.leadCrm.findUniqueOrThrow({ where: { id: a.lead.id }, select: { atualizadoEm: true } });
        a.atualizadoEmDepois = salvo.atualizadoEm.toISOString();
      }
    }
    return tx.importacaoDebitosCrm.update({ where: { id }, data: acao === 'aplicar' ? { aplicadoEm: new Date(), relatorio: relatorio as unknown as Prisma.InputJsonValue } : { desfeitoEm: new Date() } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
}

// Restauração explícita: a prévia vincula a confirmação ao estado conferido.
// O backup fica no mesmo relatório e é salvo atomicamente com a restauração.
type RegistroRestauracao = { id: string; nome: string; atual: Debito; anterior: Debito; atualizadoEm: string };
async function prepararRestauracao(tx: Prisma.TransactionClient, id: string, usuarioId: string) {
  const importacao = await tx.importacaoDebitosCrm.findFirst({ where: { id, usuarioId } });
  if (!importacao) throw new ErroImportacao('Importação não encontrada.', 404);
  if (!importacao.aplicadoEm) throw new ErroImportacao('Esta atualização ainda não foi aplicada.');
  if (importacao.desfeitoEm) throw new ErroImportacao('Esta atualização já foi desfeita. Nenhum dado foi alterado.');
  const relatorio = importacao.relatorio as unknown as RelatorioDebitos & { backupsDuplicados?: BackupDuplicado[] };
  if (relatorio.backupsDuplicados?.length) throw new ErroImportacao('Este lote unificou cadastros. Use Desfazer atualização para restaurar também as duplicatas e seus vínculos.');
  if (!relatorio.atualizacoes.length) throw new ErroImportacao('Este lote não contém débitos para restaurar.');
  const ids = relatorio.atualizacoes.map(a => a.lead.id);
  if (new Set(ids).size !== ids.length) throw new ErroImportacao('O lote contém cadastros repetidos. A restauração precisa ser revisada.');
  const leads = await tx.leadCrm.findMany({ where: { usuarioId, id: { in: ids } } });
  const porId = new Map(leads.map(l => [l.id, l]));
  const ausentes = relatorio.atualizacoes.filter(a => !porId.has(a.lead.id)).map(a => ({ id: a.lead.id, nome: a.lead.nome }));
  const registros: RegistroRestauracao[] = relatorio.atualizacoes.flatMap(a => {
    const lead = porId.get(a.lead.id);
    return lead ? [{ id: lead.id, nome: lead.nome, atual: somenteDebito(serializarLeadDebito(lead)), anterior: somenteDebito(a.lead), atualizadoEm: lead.atualizadoEm.toISOString() }] : [];
  });
  const token = createHash('sha256').update(JSON.stringify({ id, aplicadoEm: importacao.aplicadoEm, registros, ausentes })).digest('hex');
  return { importacao, registros, ausentes, token };
}
export async function analisarRestauracaoDebitos(id: string, usuarioId: string) {
  return prisma.$transaction(async tx => {
    const p = await prepararRestauracao(tx, id, usuarioId);
    return { arquivo: p.importacao.arquivo, registros: p.registros, ausentes: p.ausentes, token: p.token };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
}
export async function restaurarDebitosAnteriores(id: string, usuarioId: string, token: string) {
  return prisma.$transaction(async tx => {
    const p = await prepararRestauracao(tx, id, usuarioId);
    if (p.token !== token) throw new ErroImportacao('Os dados mudaram desde a conferência. Consulte os valores novamente antes de restaurar.');
    if (p.ausentes.length) throw new ErroImportacao(`${p.ausentes.length} empresa(s) do lote não existem mais. Nenhum valor foi restaurado. A recuperação desses cadastros exige um backup anterior.`);
    for (const r of p.registros) {
      const salvo = await tx.leadCrm.updateMany({
        where: { id: r.id, usuarioId, atualizadoEm: new Date(r.atualizadoEm), ...dadosDebito(r.atual) },
        data: { ...dadosDebito(r.anterior), movimentadoEm: new Date() },
      });
      if (salvo.count !== 1) throw new ErroImportacao('Um cadastro mudou durante a restauração. Nenhum valor foi restaurado. Atualize a conferência.');
      await registrarHistoricoCrm(tx, usuarioId, r.id, 'Débitos restaurados ao estado anterior à planilha', compararCamposCrm(dadosDebito(r.atual), dadosDebito(r.anterior)));
    }
    const agora = new Date();
    const relatorio = { ...(p.importacao.relatorio as Prisma.JsonObject), restauracao: {
      em: agora.toISOString(), token: p.token, backup: p.registros,
    } };
    await tx.importacaoDebitosCrm.update({ where: { id }, data: { desfeitoEm: agora, relatorio: relatorio as unknown as Prisma.InputJsonValue } });
    return { ok: true, restaurados: p.registros.length, arquivo: p.importacao.arquivo };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
}
