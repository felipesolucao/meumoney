import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(file, deps) {
  const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => { if (!(id in deps)) throw new Error(id); return deps[id]; }, mod, mod.exports);
  return mod.exports;
}
const core = load('lib/crmDebitos.ts', {});
class ErroImportacao extends Error { constructor(message, status = 409) { super(message); this.status = status; } }
const lead = (id, extra = {}) => ({ id, usuarioId: 'u1', nome: 'Empresa Á', codigo: '001', cnpj: '00.123.456/0001-99', criadoEm: new Date('2026-11-01'), atualizadoEm: new Date('2026-11-01'), camposExtras: { Setor: 'Comércio' }, ...extra });
function fixture() {
  let state = { leads: [lead('anterior'), lead('novo1', { criadoEm: new Date('2026-11-04') }), lead('novo2', { codigo: '002', criadoEm: new Date('2026-11-04') })], lotes: [] };
  const tx = {
    leadCrm: {
      findFirst: async ({ where }) => state.leads.find(l => l.id === where.id && l.usuarioId === where.usuarioId),
      findMany: async ({ where }) => state.leads.filter(l => l.usuarioId === where.usuarioId),
      deleteMany: async ({ where }) => {
        assert.deepEqual(where.atendimentos, { none: {} }); assert.deepEqual(where.negociacoes, { none: {} }); assert.deepEqual(where.contratos, { none: {} });
        const n = state.leads.length;
        state.leads = state.leads.filter(l => !(l.id === where.id && l.usuarioId === where.usuarioId && +l.atualizadoEm === +where.atualizadoEm && !l.vinculado));
        return { count: n - state.leads.length };
      },
    },
    importacaoLeadsCrm: {
      findFirst: async ({ where }) => state.lotes.find(l => l.id === where.id && l.usuarioId === where.usuarioId),
      findMany: async ({ where }) => state.lotes.filter(l => l.usuarioId === where.usuarioId),
      update: async ({ where, data }) => Object.assign(state.lotes.find(l => l.id === where.id), data),
      create: async ({ data }) => { const l = { ...data, id: 'recuperacao' }; state.lotes.push(l); return l; },
    },
  };
  const api = load('lib/crmImportacoesServidor.ts', {
    'node:crypto': crypto, '@prisma/client': { Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } } },
    './prisma': { prisma: { $transaction: async (fn, options) => { assert.equal(options.isolationLevel, 'Serializable'); const backup = globalThis.structuredClone(state); try { return await fn(tx); } catch (e) { state = backup; throw e; } } } },
    './crmDebitosServidor': { ErroImportacao }, './crmDebitos': core,
  });
  return { api, state: () => state, lote: () => state.lotes.push({ id: 'lote', usuarioId: 'u1', registros: state.leads.slice(1).map(api.snapshotImportado), desfeitoEm: null }) };
}
test('desfazer exclui apenas empresas do lote, preserva anteriores e é idempotente', async () => {
  const f = fixture(); f.lote();
  await f.api.desfazerImportacaoLeads('lote', 'u1');
  assert.deepEqual(f.state().leads.map(l => l.id), ['anterior']); assert.ok(f.state().lotes[0].desfeitoEm);
  await f.api.desfazerImportacaoLeads('lote', 'u1'); assert.equal(f.state().leads.length, 1);
});
test('lote de outro usuário não pode ser desfeito', async () => {
  const f = fixture(); f.lote();
  await assert.rejects(f.api.desfazerImportacaoLeads('lote', 'u2'), e => e.status === 404);
  assert.equal(f.state().leads.length, 3);
});
test('alteração em campos extras ou vínculo impede exclusão e reverte todo o lote', async () => {
  for (const vinculado of [false, true]) {
    const f = fixture();
    f.state().leads[2].vinculado = vinculado;
    f.lote();
    if (!vinculado) f.state().leads[2].camposExtras.Setor = 'Serviços';
    await assert.rejects(f.api.desfazerImportacaoLeads('lote', 'u1'));
    assert.equal(f.state().leads.length, 3); assert.equal(f.state().lotes[0].desfeitoEm, null);
  }
});
test('fingerprint independe da ordem de chaves e inclui conteúdo de objetos extras', () => {
  const f = fixture(); const a = lead('a'); const b = { ...a, camposExtras: { Outro: 'x', Setor: 'Comércio' } };
  assert.notEqual(f.api.snapshotImportado(a).fingerprint, f.api.snapshotImportado(b).fingerprint);
  assert.equal(f.api.snapshotImportado(b).fingerprint, f.api.snapshotImportado({ ...b, camposExtras: { Setor: 'Comércio', Outro: 'x' } }).fingerprint);
});
test('recuperação antiga exige cadastro anterior preservado e registra a remoção', async () => {
  const f = fixture(); const r = f.api.snapshotImportado(f.state().leads[1]);
  await f.api.recuperarDuplicadas('u1', [r]);
  assert.deepEqual(f.state().leads.map(l => l.id), ['anterior', 'novo2']);
  assert.ok(f.state().lotes[0].desfeitoEm); assert.equal(f.state().lotes[0].quantidade, 1);
});
test('recuperação recusa identificadores divergentes, cadastro original e empresas já rastreadas', async () => {
  const f = fixture();
  for (const l of [f.state().leads[0], f.state().leads[2]]) await assert.rejects(f.api.recuperarDuplicadas('u1', [f.api.snapshotImportado(l)]));
  f.lote(); await assert.rejects(f.api.recuperarDuplicadas('u1', [f.api.snapshotImportado(f.state().leads[1])]));
  assert.equal(f.state().leads.length, 3);
});
test('recuperação recusa remover também o cadastro que comprova a duplicata', async () => {
  const f = fixture(); await assert.rejects(f.api.recuperarDuplicadas('u1', f.state().leads.slice(0, 2).map(f.api.snapshotImportado)));
  assert.equal(f.state().leads.length, 3);
});

function importacaoFixture({ falhar = false, sessao = true } = {}) {
  let salvos = [], lotes = [];
  const tx = {
    estagioCrmConfig: { findMany: async () => [] },
    leadCrm: { count: async () => salvos.length, create: async ({ data }) => { const l = lead(`novo-${salvos.length}`, data); salvos.push(l); return l; } },
    importacaoLeadsCrm: { create: async ({ data }) => { if (falhar) throw new Error('Falha ao gravar lote'); const l = { ...data, id: 'lote' }; lotes.push(l); return l; } },
  };
  const { POST } = load('app/api/crm/leads/importar/route.ts', {
    'next/server': { NextResponse: { json: (d, init) => Response.json(d, init) } },
    '@prisma/client': { Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } } },
    '../../../../../lib/auth': { obterSessao: async () => sessao ? { id: 'u1' } : null },
    '../../../../../lib/crm': { CAMPOS_IMPORTACAO: [{ chave: 'nome', aliases: ['nome'] }], ESTAGIOS_IDS: ['inicio'], mesclarEstagiosConfig: () => [{ id: 'inicio', label: 'Início', labelPadrao: 'Início' }], normalizarTexto: s => s.toLowerCase() },
    '../../../../../lib/crmAutomacao': { aplicarAutomacoes: async (_u, l, db) => { assert.equal(db, tx); l.estagio = 'automatico'; return l; } },
    '../../../../../lib/crmImportacoesServidor': { snapshotImportado: l => ({ id: l.id, atualizadoEm: l.atualizadoEm.toISOString(), fingerprint: l.estagio }) },
    '../../../../../lib/prisma': { prisma: { $transaction: async fn => { const backup = globalThis.structuredClone({ salvos, lotes }); try { return await fn(tx); } catch (e) { salvos = backup.salvos; lotes = backup.lotes; throw e; } } } },
  });
  return { post: body => POST({ json: async () => body }), estado: () => ({ salvos, lotes }) };
}
test('importação CSV registra o arquivo e todos os IDs depois das automações na mesma transação', async () => {
  const f = importacaoFixture(); const r = await f.post({ csv: 'Nome\nEmpresa A\nEmpresa B', arquivo: 'carteira.csv' });
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true, importados: 2, importacaoId: 'lote' });
  const [lote] = f.estado().lotes; assert.equal(lote.arquivo, 'carteira.csv');
  assert.deepEqual(lote.registros.map(r => r.id), ['novo-0', 'novo-1']); assert.ok(lote.registros.every(r => r.fingerprint === 'automatico'));
});
test('falha no registro do lote reverte a importação inteira', async () => {
  const f = importacaoFixture({ falhar: true }); assert.equal((await f.post({ csv: 'Nome\nEmpresa' })).status, 409);
  assert.deepEqual(f.estado(), { salvos: [], lotes: [] });
});
test('importação exige sessão e nome antes de gravar empresas', async () => {
  const anon = importacaoFixture({ sessao: false }); assert.equal((await anon.post({ csv: 'Nome\nA' })).status, 401);
  const f = importacaoFixture(); assert.equal((await f.post({ csv: 'Outra coluna\nA' })).status, 400); assert.equal(f.estado().salvos.length, 0);
});

test('histórico de lotes reúne planilhas e débitos sem expor snapshots ou outra conta', async () => {
  const { GET } = load('app/api/crm/importacoes/route.ts', {
    'next/server': { NextResponse: { json: (d, init) => Response.json(d, init) } },
    '../../../../lib/auth': { obterSessao: async () => ({ id: 'u1' }) },
    '../../../../lib/prisma': { prisma: Object.fromEntries(['importacaoLeadsCrm', 'importacaoDebitosCrm'].map((chave, i) => [chave, { findMany: async ({ where, select }) => {
      assert.deepEqual(where, { usuarioId: 'u1' }); assert.equal(select.registros, undefined); assert.equal(select.relatorio, undefined);
      return [{ id: chave, arquivo: 'planilha', criadoEm: new Date(`2026-11-0${i + 1}`), desfeitoEm: null, ...(i ? { aplicadoEm: null } : { quantidade: 2 }) }];
    } }])) },
  });
  const r = await GET({ nextUrl: new URL('http://localhost/api/crm/importacoes') });
  const dados = await r.json(); assert.deepEqual(dados.itens.map(i => i.tipo), ['debitos', 'leads']); assert.equal(dados.temMais, false);
  assert.equal((await GET({ nextUrl: new URL('http://localhost/api/crm/importacoes?pagina=-1') })).status, 400);
});
