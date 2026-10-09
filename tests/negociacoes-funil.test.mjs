import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server.js';
function load(file, dependencies = {}) {
  const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => { if (!(id in dependencies)) throw new Error(id); return dependencies[id]; }, mod, mod.exports);
  return mod.exports;
}
const lib = load('lib/negociacoes.ts');
const empresaLib = load('lib/negociacaoEmpresa.ts', { './crm': load('lib/crm.ts') });
const empresa = { id: 'l1', nome: 'Solução Comércio', cnpj: '12.345.678/0001-90', valorEmAberto: '250.50', quantidadeParcelas: 2, telefone: '11999999999', email: 'empresa@example.com' };
const acordo = (leadId = 'l1') => lib.validarNegociacao({ leadId, empresa: empresa.nome, cnpj: empresa.cnpj, tipo: 'avista', dataNegociacao: '2026-01-20', debitoCentavos: 25050, totalCentavos: 20000, parcelasOriginais: 2, observacoes: '', parcelas: lib.gerarParcelas(20000, 1, '2026-01-31') });
const quitar = n => ({ ...n, parcelas: n.parcelas.map(p => ({ ...p, pagoCentavos: p.valorCentavos, dataPagamento: '2026-01-20' })) });
function contexto({ falharHistorico = false } = {}) {
  let estado = { leads: [
    { ...empresa, usuarioId: 'u1', estagio: 'em_negociacao', ordem: 0 },
    { ...empresa, id: 'l2', usuarioId: 'u1', estagio: 'em_negociacao', ordem: 0 },
    { ...empresa, id: 'alheia', usuarioId: 'u2', estagio: 'em_negociacao', ordem: 0 },
  ], acordos: [], historico: [] };
  const bate = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
  const tx = {
    contrato: { findMany: async () => [] },
    historicoCrm: { create: async ({ data }) => data },
    leadCrm: {
      findFirst: async ({ where }) => estado.leads.find(l => bate(l, where)) ?? null,
      aggregate: async ({ where }) => ({ _max: { ordem: Math.max(-1, ...estado.leads.filter(l => bate(l, where)).map(l => l.ordem)) } }),
      updateMany: async ({ where, data }) => { const rows = estado.leads.filter(l => bate(l, where)); rows.forEach(l => Object.assign(l, data)); return { count: rows.length }; },
    },
    negociacaoCrm: {
      findFirst: async ({ where }) => globalThis.structuredClone(estado.acordos.find(n => bate(n, where)) ?? null),
      findMany: async ({ where }) => estado.acordos.filter(n => bate(n, where)),
      create: async ({ data }) => { const n = { id: `n${estado.acordos.length + 1}`, versao: 1, leadId: null, ...globalThis.structuredClone(data) }; estado.acordos.push(n); return globalThis.structuredClone(n); },
      updateMany: async ({ where, data }) => { const rows = estado.acordos.filter(n => bate(n, where)); rows.forEach(n => Object.assign(n, data, { versao: n.versao + data.versao.increment })); return { count: rows.length }; },
      deleteMany: async ({ where }) => { const antes = estado.acordos.length; estado.acordos = estado.acordos.filter(n => !bate(n, where)); return { count: antes - estado.acordos.length }; },
    },
    atendimentoCrm: { create: async ({ data }) => { if (falharHistorico) throw new Error('Falha no histórico'); estado.historico.push(data); } },
  };
  const prisma = { ...tx, $transaction: async (fn, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    const anterior = globalThis.structuredClone(estado);
    try { return await fn(tx); } catch (e) { estado = anterior; throw e; }
  } };
  const funil = load('lib/negociacoesFunil.ts', { '@prisma/client': { Prisma }, './prisma': { prisma }, './crmHistoricoServidor': load('lib/crmHistoricoServidor.ts', { './crmHistorico': load('lib/crmHistorico.ts') }) });
  return { ...funil, estado: () => estado, prisma };
}
test('busca aceita nome sem acentos e CNPJ com ou sem máscara', () => {
  for (const termo of ['solucao', 'COMÉRCIO', '12345678', '12.345.678/0001']) assert.deepEqual(empresaLib.pesquisarEmpresas([empresa], termo), [empresa]);
  assert.deepEqual(empresaLib.pesquisarEmpresas([empresa], 'inexistente'), []);
});
test('seleção preenche dados editáveis, sem destruir pagamentos existentes', () => {
  const dados = empresaLib.preencherEmpresa({ ...acordo(null), parcelas: [] }, empresa);
  assert.equal(dados.leadId, 'l1'); assert.equal(dados.debitoCentavos, 25050); assert.equal(dados.totalCentavos, 25050); assert.equal(dados.parcelasOriginais, 2);
  const personalizado = lib.prepararNegociacaoParaSalvar({ ...dados, debitoCentavos: 30000, totalCentavos: 28000, parcelasOriginais: 4 }, 1, '2026-01-31');
  assert.equal(personalizado.debitoCentavos, 30000); assert.equal(personalizado.parcelasOriginais, 4);
  const existente = quitar(acordo());
  const selecionado = empresaLib.preencherEmpresa(existente, empresa);
  assert.equal(selecionado.totalCentavos, existente.totalCentavos); assert.deepEqual(selecionado.parcelas, existente.parcelas);
});
test('salvar, pagamento parcial, quitação e correção movem funil e preservam cadastro original', async () => {
  const c = contexto(); const n = await c.criarNegociacao('u1', acordo());
  assert.equal(c.estado().leads[0].estagio, 'aguardando_pagamento');
  assert.equal(c.estado().leads[0].valorEmAberto, '250.50');
  assert.equal(c.estado().historico.length, 1);
  await c.alterarNegociacao('u1', n.id, 1, { ...acordo(), parcelas: acordo().parcelas.map(p => ({ ...p, pagoCentavos: 100, dataPagamento: '2026-01-20' })) });
  assert.equal(c.estado().leads[0].estagio, 'aguardando_pagamento'); assert.equal(c.estado().historico.length, 1);
  await c.alterarNegociacao('u1', n.id, 2, quitar(acordo()));
  assert.equal(c.estado().leads[0].estagio, 'negociado');
  await c.alterarNegociacao('u1', n.id, 3, acordo());
  assert.equal(c.estado().leads[0].estagio, 'aguardando_pagamento');
});
test('empresa só é concluída quando todos os seus acordos estão quitados', async () => {
  const c = contexto(); const n1 = await c.criarNegociacao('u1', acordo()); const n2 = await c.criarNegociacao('u1', acordo());
  await c.alterarNegociacao('u1', n1.id, 1, quitar(acordo()));
  assert.equal(c.estado().leads[0].estagio, 'aguardando_pagamento');
  await c.alterarNegociacao('u1', n2.id, 1, quitar(acordo()));
  assert.equal(c.estado().leads[0].estagio, 'negociado');
});
test('trocar, remover vínculo e excluir recalculam as empresas afetadas', async () => {
  const c = contexto(); const n = await c.criarNegociacao('u1', acordo());
  await c.alterarNegociacao('u1', n.id, 1, acordo('l2'));
  assert.equal(c.estado().leads[0].estagio, 'em_negociacao'); assert.equal(c.estado().leads[1].estagio, 'aguardando_pagamento');
  await c.alterarNegociacao('u1', n.id, 2, acordo(null));
  assert.equal(c.estado().leads[1].estagio, 'em_negociacao');
  const n2 = await c.criarNegociacao('u1', acordo());
  await c.alterarNegociacao('u1', n2.id, 1);
  assert.equal(c.estado().leads[0].estagio, 'em_negociacao');
});
test('sem vínculo mantém cadastro manual; cliente antigo preserva vínculo ao editar', async () => {
  const c = contexto(); await c.criarNegociacao('u1', acordo(null));
  assert.equal(c.estado().historico.length, 0);
  const n = await c.criarNegociacao('u1', acordo());
  const { leadId, ...antigo } = quitar(acordo());
  await c.alterarNegociacao('u1', n.id, 1, antigo);
  assert.equal(c.estado().acordos[1].leadId, leadId); assert.equal(c.estado().leads[0].estagio, 'negociado');
});
test('vínculo de outro usuário e versão obsoleta não alteram acordo nem funil', async () => {
  const c = contexto();
  await assert.rejects(c.criarNegociacao('u1', acordo('alheia')), e => e.status === 400);
  assert.equal(c.estado().acordos.length, 0);
  const n = await c.criarNegociacao('u1', acordo()); const antes = globalThis.structuredClone(c.estado());
  await assert.rejects(c.alterarNegociacao('u2', n.id, 1, quitar(acordo())), e => e.status === 409);
  await assert.rejects(c.alterarNegociacao('u1', n.id, 9, quitar(acordo())), e => e.status === 409);
  await assert.rejects(c.alterarNegociacao('u1', n.id, 1, acordo('alheia')), e => e.status === 400);
  assert.deepEqual(c.estado(), antes);
});
test('falha na atualização do histórico reverte gravação do acordo e movimentação', async () => {
  const c = contexto({ falharHistorico: true }); const antes = globalThis.structuredClone(c.estado());
  await assert.rejects(c.criarNegociacao('u1', acordo()), /Falha no histórico/);
  assert.deepEqual(c.estado(), antes);
});
test('conflito serializável é repetido até três tentativas e retorna 409 se persistir', async () => {
  const c = contexto(); let tentativas = 0;
  c.prisma.$transaction = async () => { tentativas++; throw new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: '5.22' }); };
  await assert.rejects(c.criarNegociacao('u1', acordo()), e => e.status === 409);
  assert.equal(tentativas, 3);
});
test('API de busca exige sessão, isola proprietário e limita resultados', async () => {
  const consultas = [];
  const prisma = { leadCrm: { findMany: async q => { consultas.push(q); return Array.from({ length: 25 }, (_, i) => ({ ...empresa, id: String(i) })); } } };
  const rota = sessao => load('app/api/crm/empresas/route.ts', { 'next/server': { NextResponse }, '../../../../lib/auth': { obterSessao: async () => sessao }, '../../../../lib/prisma': { prisma }, '../../../../lib/negociacaoEmpresa': empresaLib });
  const req = q => ({ nextUrl: new URL(`http://localhost/?q=${q}`) });
  assert.equal((await rota(null).GET(req('solucao'))).status, 401); assert.equal(consultas.length, 0);
  assert.deepEqual(await (await rota({ id: 'u1' }).GET(req('s'))).json(), []); assert.equal(consultas.length, 0);
  assert.equal((await (await rota({ id: 'u1' }).GET(req('solucao'))).json()).length, 20);
  assert.deepEqual(consultas[0].where, { usuarioId: 'u1' });
});

test('seleção copia os dois telefones e limpa contatos ao trocar para empresa sem números', () => {
  const dados = empresaLib.preencherEmpresa(acordo(null), { ...empresa, telefone: '(62) 99999-1234', telefone2: '(62) 3333-1234' });
  assert.equal(dados.telefone, '(62) 99999-1234');
  assert.equal(dados.telefone2, '(62) 3333-1234');
  const semContatos = empresaLib.preencherEmpresa(dados, { ...empresa, telefone: null, telefone2: null });
  assert.equal(semContatos.telefone, '');
  assert.equal(semContatos.telefone2, '');
});
