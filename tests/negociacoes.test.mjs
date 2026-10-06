import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { NextResponse } from 'next/server.js';
import { Prisma } from '@prisma/client';
function load(file, dependencies = {}) {
  const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => { if (!(id in dependencies)) throw new Error(id); return dependencies[id]; }, mod, mod.exports);
  return mod.exports;
}
const lib = load('lib/negociacoes.ts');
const { gerarParcelas, validarNegociacao, statusParcela, statusNegociacao, resumoNegociacoes } = lib;
const acordo = () => ({ empresa: 'Empresa A', cnpj: '12.345.678/0001-90', tipo: 'parcelada', dataNegociacao: '2026-01-20', debitoCentavos: 20000, totalCentavos: 10000, parcelasOriginais: 5, observacoes: '', parcelas: gerarParcelas(10000, 3, '2026-01-31') });
test('cronograma preserva centavos e dia original após fevereiro', () => {
  const p = acordo().parcelas;
  assert.deepEqual(p.map(x => x.valorCentavos), [3334, 3333, 3333]);
  assert.deepEqual(p.map(x => x.vencimento), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.equal(gerarParcelas(100, 2, '2028-01-31')[1].vencimento, '2028-02-29');
  assert.throws(() => gerarParcelas(1, 2, '2026-01-01'));
});
test('status vence apenas depois do dia combinado, preserva parciais e quitação', () => {
  const p = acordo().parcelas[0];
  assert.equal(statusParcela(p, '2026-01-31'), 'aguardando');
  assert.equal(statusParcela({ ...p, pagoCentavos: 100 }, '2026-02-01'), 'atrasado');
  assert.equal(statusParcela({ ...p, pagoCentavos: p.valorCentavos }, '2026-02-01'), 'pago');
  assert.equal(statusParcela({ ...p, situacao: 'em_aberto', vencimento: '' }), 'em_aberto');
  assert.equal(statusNegociacao(acordo(), '2026-02-01'), 'atrasado');
});
test('validação aceita descontos e normaliza CNPJ, rejeita parcelas e datas inválidas', () => {
  const n = acordo();
  assert.equal(validarNegociacao(n).cnpj, '12345678000190');
  for (const mudanca of [{ totalCentavos: 9999 }, { parcelasOriginais: 0 }, { tipo: 'avista' }, { dataNegociacao: '2026-02-30' }, { totalCentavos: Infinity }, { cnpj: '' }]) assert.throws(() => validarNegociacao({ ...n, ...mudanca }));
  for (const mudanca of [{ pagoCentavos: 99999 }, { pagoCentavos: -1 }, { pagoCentavos: 100, dataPagamento: '' }, { pagoCentavos: 100, dataPagamento: '2099-01-01' }, { vencimento: '2026-02-30' }, { vencimento: '' }]) assert.throws(() => validarNegociacao({ ...n, parcelas: n.parcelas.map((p, i) => i ? p : { ...p, ...mudanca }) }));
});
test('indicadores deduplicam empresas, somam parciais e recuperam originais só na quitação', () => {
  const n = validarNegociacao(acordo());
  n.parcelas[0].pagoCentavos = 100;
  const quitado = { ...n, parcelas: n.parcelas.map(p => ({ ...p, pagoCentavos: p.valorCentavos })) };
  assert.deepEqual(resumoNegociacoes([n, quitado]), { negociado: 20000, pago: 10100, empresas: 1, recuperadas: 5 });
});
function api({ sessao = { id: 'u1' }, count = 1 } = {}) {
  const chamadas = [];
  const db = { findFirst: async () => ({ leadId: null }), findMany: async q => { chamadas.push(q); return []; }, create: async q => { chamadas.push(q); return { id: 'n1', ...q.data }; }, updateMany: async q => { chamadas.push(q); return { count }; }, deleteMany: async q => { chamadas.push(q); return { count }; } };
  const prisma = { negociacaoCrm: db, $transaction: async fn => fn({ negociacaoCrm: db }) };
  const funil = load('lib/negociacoesFunil.ts', { '@prisma/client': { Prisma }, './prisma': { prisma }, './crmHistoricoServidor': load('lib/crmHistoricoServidor.ts', { './crmHistorico': load('lib/crmHistorico.ts') }) });
  function rota(file, prefix) { return load(file, { 'next/server': { NextResponse }, [`${prefix}/auth`]: { obterSessao: async () => sessao }, [`${prefix}/prisma`]: { prisma }, [`${prefix}/negociacoes`]: lib, [`${prefix}/negociacoesFunil`]: funil }); }
  return { chamadas, colecao: rota('app/api/crm/negociacoes/route.ts', '../../../../lib'), item: rota('app/api/crm/negociacoes/[id]/route.ts', '../../../../../lib') };
}
test('todas as operações exigem sessão antes de acessar banco', async () => {
  const a = api({ sessao: null });
  const req = { json: async () => acordo(), nextUrl: new URL('http://localhost/?versao=1') }; const ctx = { params: { id: 'n1' } };
  for (const r of [await a.colecao.GET(), await a.colecao.POST(req), await a.item.PUT(req, ctx), await a.item.DELETE(req, ctx)]) assert.equal(r.status, 401);
  assert.equal(a.chamadas.length, 0);
});
test('APIs restringem proprietário e usam versão para evitar sobrescrita e exclusão concorrentes', async () => {
  const a = api(); const ctx = { params: { id: 'n1' } };
  await a.colecao.GET(); assert.deepEqual(a.chamadas[0].where, { usuarioId: 'u1' });
  await a.colecao.POST({ json: async () => ({ ...acordo(), usuarioId: 'invasor' }) }); assert.equal(a.chamadas[1].data.usuarioId, 'u1');
  await a.item.PUT({ json: async () => ({ ...acordo(), versao: 2 }) }, ctx);
  assert.deepEqual(a.chamadas[2].where, { id: 'n1', usuarioId: 'u1', versao: 2 });
  assert.deepEqual(a.chamadas[2].data.versao, { increment: 1 });
  await a.item.DELETE({ nextUrl: new URL('http://localhost/?versao=2') }, ctx);
  assert.deepEqual(a.chamadas[3].where, { id: 'n1', usuarioId: 'u1', versao: 2 });
  assert.equal((await api({ count: 0 }).item.PUT({ json: async () => ({ ...acordo(), versao: 2 }) }, ctx)).status, 409);
});
test('entrada inválida e JSON malformado não gravam dados', async () => {
  const a = api();
  assert.equal((await a.colecao.POST({ json: async () => ({}) })).status, 400);
  assert.equal((await a.colecao.POST({ json: async () => { throw new SyntaxError(); } })).status, 400);
  assert.equal(a.chamadas.length, 0);
});
test('salvar à vista gera uma parcela mesmo com duas parcelas originais em aberto', async () => {
  const dados = { ...acordo(), tipo: 'avista', parcelasOriginais: 2, parcelas: [] };
  const preparado = lib.prepararNegociacaoParaSalvar(dados, 1, '2026-10-02');
  assert.equal(preparado.parcelasOriginais, 2);
  assert.deepEqual(preparado.parcelas, gerarParcelas(dados.totalCentavos, 1, '2026-10-02'));
  const a = api();
  const resposta = await a.colecao.POST({ json: async () => preparado });
  assert.equal(resposta.status, 201);
  assert.equal(a.chamadas[0].data.parcelasOriginais, 2);
});
test('salvar gera cronograma parcelado vazio e preserva cronograma editado com pagamentos', () => {
  const dados = acordo();
  assert.deepEqual(lib.prepararNegociacaoParaSalvar({ ...dados, parcelas: [] }, 3, '2026-01-31').parcelas, dados.parcelas);
  dados.parcelas[0] = { ...dados.parcelas[0], pagoCentavos: 100, dataPagamento: '2026-01-20', vencimento: '2026-02-05' };
  assert.deepEqual(lib.prepararNegociacaoParaSalvar(dados, 4, '2026-10-02').parcelas, dados.parcelas);
});
test('validação distingue cronograma vazio, limite e incompatibilidade com modalidade', () => {
  const dados = acordo();
  assert.throws(() => validarNegociacao({ ...dados, parcelas: [] }), /Gere o cronograma/);
  assert.throws(() => validarNegociacao({ ...dados, parcelas: Array(361).fill(dados.parcelas[0]) }), /máximo 360/);
  assert.throws(() => validarNegociacao({ ...dados, tipo: 'avista' }), /exatamente uma parcela/);
  assert.throws(() => lib.prepararNegociacaoParaSalvar({ ...dados, parcelas: [] }, 1, '2026-10-02'), /pelo menos duas parcelas/);
  assert.equal(lib.prepararNegociacaoParaSalvar({ ...dados, parcelas: [] }, 360, '2026-10-02').parcelas.length, 360);
});
