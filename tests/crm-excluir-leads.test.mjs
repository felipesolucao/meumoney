import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function contexto(falhar = false) {
  let estado = {
    leads: [{ id: 'a', usuarioId: 'u1' }, { id: 'b', usuarioId: 'u1' }, { id: 'c', usuarioId: 'u2' }],
    negociacoes: ['a', 'b', 'c', null].map((leadId, i) => ({ id: String(i), leadId, usuarioId: i === 2 ? 'u2' : 'u1', empresa: 'Empresa', cnpj: '123', observacoes: 'Histórico financeiro', versao: 1, parcelas: [{ valorCentavos: 500, pagoCentavos: 200, dataPagamento: '2026-11-12' }] })),
    contratos: ['a', 'c'].map((leadId, i) => ({ id: String(i), leadId, usuarioId: i ? 'u2' : 'u1', parcelas: [{ valor: 100, pago: true }], historico: ['Pagamento recebido'] })),
  };
  const selecionado = (lead, where) => lead.usuarioId === where.usuarioId && (!where.id || where.id.in.includes(lead.id));
  const atualizar = tabela => async ({ where, data }) => {
    for (const row of estado[tabela]) {
      if (row.usuarioId !== where.usuarioId || !estado.leads.some(l => l.id === row.leadId && selecionado(l, where.lead.is))) continue;
      row.leadId = data.leadId;
      if (data.versao) row.versao += data.versao.increment;
    }
  };
  const tx = {
    negociacaoCrm: { updateMany: atualizar('negociacoes') },
    contrato: { updateMany: atualizar('contratos') },
    leadCrm: { deleteMany: async ({ where }) => {
      if (falhar) throw new Error('Falha ao excluir');
      const removidos = estado.leads.filter(l => selecionado(l, where));
      // Simula inclusive um banco legado com cascata: os vínculos devem
      // ter sido removidos antes de apagar a empresa.
      for (const tabela of ['negociacoes', 'contratos']) estado[tabela] = estado[tabela].filter(n => !removidos.some(l => l.id === n.leadId));
      estado.leads = estado.leads.filter(l => !selecionado(l, where));
      return { count: removidos.length };
    } },
  };
  const transacaoNegociacao = async fn => {
    const antes = globalThis.structuredClone(estado);
    try { return await fn(tx); } catch (e) { estado = antes; throw e; }
  };
  const output = ts.transpileModule(fs.readFileSync(new URL('../lib/crmExcluirLeads.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(() => ({ transacaoNegociacao }), mod, mod.exports);
  return { excluir: mod.exports.excluirLeadsPreservandoNegociacoes, estado: () => globalThis.structuredClone(estado) };
}

for (const ids of [undefined, ['a'], ['a', 'c'], []]) {
  test(`limpeza ${JSON.stringify(ids)} mantém dados financeiros e isola usuários`, async () => {
    const c = contexto(); const antes = c.estado();
    const removidos = antes.leads.filter(l => l.usuarioId === 'u1' && (ids === undefined || ids.includes(l.id)));
    assert.equal((await c.excluir('u1', ids)).count, removidos.length);
    for (const tabela of ['negociacoes', 'contratos']) {
      const esperado = antes[tabela].map(n => removidos.some(l => l.id === n.leadId) ? { ...n, leadId: null, ...(tabela === 'negociacoes' ? { versao: n.versao + 1 } : {}) } : n);
      assert.deepEqual(c.estado()[tabela], esperado);
    }
    assert.ok(c.estado().leads.some(l => l.id === 'c'));
    // Repetir a limpeza não altera acordos já desvinculados.
    const apos = c.estado(); await c.excluir('u1', ids); assert.deepEqual(c.estado(), apos);
  });
}
test('falha ao excluir reverte todos os vínculos', async () => {
  const c = contexto(true); const antes = c.estado();
  await assert.rejects(c.excluir('u1'), /Falha ao excluir/);
  assert.deepEqual(c.estado(), antes);
});
