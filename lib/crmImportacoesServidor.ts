import { createHash } from 'node:crypto';
import { Prisma, type LeadCrm } from '@prisma/client';
import { prisma } from './prisma';
import { ErroImportacao } from './crmDebitosServidor';
import { normalizarCodigo, normalizarDocumento, normalizarNome } from './crmDebitos';

export function snapshotImportado(lead: LeadCrm) {
  const dados = JSON.parse(JSON.stringify(lead));
  const serializado = JSON.stringify(dados, (_chave, valor) => valor && typeof valor === 'object' && !Array.isArray(valor)
    ? Object.fromEntries(Object.entries(valor).sort(([a], [b]) => a.localeCompare(b))) : valor);
  return { id: lead.id, atualizadoEm: lead.atualizadoEm.toISOString(), fingerprint: createHash('sha256').update(serializado).digest('hex') };
}
export type SnapshotImportado = ReturnType<typeof snapshotImportado>;

export function mesmaEmpresa(a: LeadCrm, b: LeadCrm) {
  const codigoA = normalizarCodigo(a.codigo ?? ''), codigoB = normalizarCodigo(b.codigo ?? '');
  const docA = normalizarDocumento(a.cnpj ?? ''), docB = normalizarDocumento(b.cnpj ?? '');
  return normalizarNome(a.nome) === normalizarNome(b.nome)
    && Boolean((codigoA && codigoA === codigoB) || (docA && docA === docB))
    && !(codigoA && codigoB && codigoA !== codigoB) && !(docA && docB && docA !== docB);
}

async function removerLote(tx: Prisma.TransactionClient, usuarioId: string, registros: SnapshotImportado[]) {
  for (const registro of registros) {
    const lead = await tx.leadCrm.findFirst({ where: { id: registro.id, usuarioId } });
    if (!lead || snapshotImportado(lead).fingerprint !== registro.fingerprint) {
      throw new ErroImportacao('Uma empresa foi alterada ou removida. Nenhuma empresa deste lote foi excluída. Atualize a consulta.');
    }
    const removido = await tx.leadCrm.deleteMany({ where: {
      id: registro.id, usuarioId, atualizadoEm: new Date(registro.atualizadoEm),
      atendimentos: { none: {} }, negociacoes: { none: {} }, contratos: { none: {} },
    } });
    if (removido.count !== 1) throw new ErroImportacao('Uma empresa tem atendimentos, negociações, contratos ou alterações posteriores. Nenhuma empresa deste lote foi excluída.');
  }
}

export async function desfazerImportacaoLeads(id: string, usuarioId: string) {
  return prisma.$transaction(async tx => {
    const lote = await tx.importacaoLeadsCrm.findFirst({ where: { id, usuarioId } });
    if (!lote) throw new ErroImportacao('Importação não encontrada.', 404);
    if (lote.desfeitoEm) return lote;
    await removerLote(tx, usuarioId, lote.registros as SnapshotImportado[]);
    return tx.importacaoLeadsCrm.update({ where: { id }, data: { desfeitoEm: new Date() } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
}

// Importações antigas não tinham vínculo de lote. Exige seleção explícita e um
// cadastro anterior correspondente; nunca deduz um lote apenas pela proximidade das datas.
export async function recuperarDuplicadas(usuarioId: string, registros: SnapshotImportado[]) {
  return prisma.$transaction(async tx => {
    const todos = await tx.leadCrm.findMany({ where: { usuarioId }, orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }] });
    const ids = new Set(registros.map(r => r.id));
    const lotes = await tx.importacaoLeadsCrm.findMany({ where: { usuarioId }, select: { registros: true } });
    const rastreados = new Set(lotes.flatMap(l => (l.registros as SnapshotImportado[]).map(r => r.id)));
    for (const r of registros) {
      const lead = todos.find(l => l.id === r.id);
      if (!lead || rastreados.has(r.id) || !todos.some(antigo => !ids.has(antigo.id) && antigo.criadoEm < lead.criadoEm && mesmaEmpresa(lead, antigo))) {
        throw new ErroImportacao('Não foi possível confirmar um cadastro anterior para cada duplicata. Atualize a consulta.');
      }
    }
    await removerLote(tx, usuarioId, registros);
    return tx.importacaoLeadsCrm.create({ data: { usuarioId, arquivo: 'Recuperação de duplicatas anteriores ao histórico', registros, quantidade: registros.length, desfeitoEm: new Date() } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
}
