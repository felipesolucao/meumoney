import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server.js';
function load(file, dependencies = {}) {
  const js = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(id => {
    if (!(id in dependencies)) throw new Error(`Dependência ausente: ${id}`);
    return dependencies[id];
  }, mod, mod.exports);
  return mod.exports;
}
const clone = v => globalThis.structuredClone(v);
function contexto({ usuario = 'u1', falharHistorico = false, vinculado = true, acordos = [] } = {}) {
  let estado = {
    contratos: [{ id: 'c1', usuarioId: 'u1', clienteId: 'cliente1', leadId: vinculado ? 'l1' : null, codigo: '#123', criadoEm: new Date('2026-10-01'), valorEmprestado: 100, status: 'em_dia', cliente: { id: 'cliente1', nome: 'Empresa A', cpf: '12.345.678/0001-90' } }],
    parcelas: [{ id: 'p1', contratoId: 'c1', numero: 1, valor: 100, valorPago: null, pagoEm: null, status: 'a_vencer', vencimento: new Date('2026-10-10') }],
    leads: [{ id: 'l1', usuarioId: 'u1', nome: 'Empresa A', cnpj: '12345678000190', estagio: 'aguardando_pagamento', ordem: 0 }],
    acordos, historico: [], atendimentos: [],
  };
  function contratos(where = {}) {
    return estado.contratos.filter(c => Object.entries(where).every(([k, v]) => k === 'leadId' && typeof v === 'object' ? c.leadId != null : c[k] === v));
  }
  function expandir(c) { return c ? clone({ ...c, parcelas: estado.parcelas.filter(p => p.contratoId === c.id), lead: estado.leads.find(l => l.id === c.leadId) ?? null }) : null; }
  const tx = {
    contrato: {
      findFirst: async ({ where }) => expandir(contratos(where)[0]),
      findMany: async ({ where }) => contratos(where).map(expandir),
      update: async ({ where, data }) => Object.assign(estado.contratos.find(c => c.id === where.id), data),
    },
    parcela: {
      findFirst: async ({ where }) => { const p = estado.parcelas.find(p => p.id === where.id); const c = p && estado.contratos.find(c => c.id === p.contratoId && c.usuarioId === where.contrato.usuarioId); return c ? clone({ ...p, contrato: c }) : null; },
      findUnique: async ({ where }) => clone(estado.parcelas.find(p => p.id === where.id)),
      update: async ({ where, data }) => Object.assign(estado.parcelas.find(p => p.id === where.id), data),
    },
    conta: { findFirst: async ({ where }) => where.id === 'conta1' && where.usuarioId === 'u1' ? { id: 'conta1' } : null },
    leadCrm: {
      findFirst: async ({ where }) => clone(estado.leads.find(l => l.id === where.id && l.usuarioId === where.usuarioId)),
      findMany: async ({ where }) => clone(estado.leads.filter(l => l.usuarioId === where.usuarioId)),
      aggregate: async () => ({ _max: { ordem: 0 } }),
      updateMany: async ({ where, data }) => { const l = estado.leads.find(l => l.id === where.id && l.usuarioId === where.usuarioId); if (l) Object.assign(l, data); return { count: l ? 1 : 0 }; },
      create: async ({ data }) => { const l = { id: `l${estado.leads.length + 1}`, ...data }; estado.leads.push(l); return l; },
    },
    negociacaoCrm: { findMany: async ({ where }) => clone(estado.acordos.filter(n => n.usuarioId === where.usuarioId && (!where.leadId || n.leadId === where.leadId))) },
    atendimentoCrm: { create: async ({ data }) => estado.atendimentos.push(data) },
  };
  const prisma = { ...tx, $transaction: async (fn, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    const antes = clone(estado);
    try { return await fn(tx); } catch (e) { estado = antes; throw e; }
  } };
  const funil = load('lib/negociacoesFunil.ts', { '@prisma/client': { Prisma }, './prisma': { prisma }, './crmHistoricoServidor': { registrarHistoricoCrm: async () => {} } });
  const integracao = load('lib/contratosNegociacoes.ts', { './negociacoesFunil': funil });
  const auth = { obterSessao: async () => usuario ? { id: usuario } : null };
  const rota = load('app/api/parcelas/[id]/route.ts', {
    'next/server': { NextResponse }, '../../../../lib/auth': auth,
    '../../../../lib/historico': { registrarAcao: async (_, data) => { if (falharHistorico) throw new Error('histórico indisponível'); estado.historico.push(data); } },
    '../../../../lib/negociacoesFunil': funil, '../../../../lib/contratosNegociacoes': integracao,
  });
  const listar = load('app/api/crm/negociacoes/route.ts', {
    'next/server': { NextResponse }, '../../../../lib/auth': auth, '../../../../lib/prisma': { prisma },
    '../../../../lib/negociacoes': {}, '../../../../lib/negociacoesFunil': funil, '../../../../lib/contratosNegociacoes': integracao,
  }).GET;
  return { estado: () => estado, tx, integracao, listar,
    alterar: body => rota.PATCH({ json: async () => body }, { params: { id: 'p1' } }),
    projetar: () => integracao.contratoComoNegociacao(expandir(estado.contratos[0])),
  };
}
test('pagamento na origem e em negociações usa a mesma parcela, quita contrato e move funil', async () => {
  const c = contexto();
  const lista = await (await c.listar()).json();
  assert.equal(lista.length, 1); assert.equal(lista[0].contratoId, 'c1'); assert.equal(lista[0].empresa, 'Empresa A');
  assert.equal((await c.alterar({ acao: 'pagar', valorRecebido: 30, valorPagoEsperado: 0, dataRecebimento: '2026-10-01', contaId: 'conta1' })).status, 200);
  assert.equal(c.projetar().parcelas[0].pagoCentavos, 3000);
  assert.equal(c.projetar().parcelas[0].dataPagamento, '2026-10-01');
  assert.equal(c.estado().leads[0].estagio, 'aguardando_pagamento');
  assert.equal((await c.alterar({ acao: 'pagar', valorRecebido: 70, valorPagoEsperado: 30, contaId: 'conta1' })).status, 200);
  assert.equal(c.estado().contratos[0].status, 'quitado'); assert.equal(c.estado().parcelas[0].contaId, 'conta1');
  assert.equal(c.estado().leads[0].estagio, 'negociado'); assert.equal(c.projetar().parcelas[0].pagoCentavos, 10000);
  assert.equal(c.estado().historico.length, 2); assert.equal(c.estado().acordos.length, 0);
  assert.equal((await c.alterar({ acao: 'pagar', valorRecebido: 70, valorPagoEsperado: 30 })).status, 409);
  assert.equal(c.estado().historico.length, 2);
});
test('estornar em negociações reabre a mesma parcela, o contrato e o funil', async () => {
  const c = contexto(); await c.alterar({ acao: 'pagar' });
  assert.equal((await c.alterar({ acao: 'reabrir' })).status, 200);
  assert.equal(c.projetar().parcelas[0].pagoCentavos, 0); assert.equal(c.estado().contratos[0].status, 'em_dia');
  assert.equal(c.estado().leads[0].estagio, 'aguardando_pagamento');
});
test('funil aguarda todos os contratos e acordos da empresa', async () => {
  const c = contexto({ acordos: [{ usuarioId: 'u1', leadId: 'l1', parcelas: [{ valorCentavos: 5000, pagoCentavos: 0 }] }] });
  await c.alterar({ acao: 'pagar' }); assert.equal(c.estado().contratos[0].status, 'quitado');
  assert.equal(c.estado().leads[0].estagio, 'aguardando_pagamento');
});
test('sem sessão, proprietário diferente, conta alheia e valores inválidos não gravam recebimentos', async () => {
  assert.equal((await contexto({ usuario: null }).alterar({ acao: 'pagar' })).status, 401);
  const alheio = contexto({ usuario: 'u2' }); assert.equal((await alheio.alterar({ acao: 'pagar' })).status, 404);
  assert.deepEqual(await (await alheio.listar()).json(), []);
  const c = contexto(); const antes = clone(c.estado());
  for (const valorRecebido of [-1, 0, 101, NaN, Infinity]) assert.equal((await c.alterar({ acao: 'pagar', valorRecebido })).status, 409);
  assert.equal((await c.alterar({ acao: 'pagar', contaId: 'alheia' })).status, 400);
  assert.equal((await c.alterar({ acao: 'pagar', dataRecebimento: 'invalida' })).status, 400);
  assert.deepEqual(c.estado(), antes);
});
test('falha de histórico desfaz recebimento, quitação e mudança no funil', async () => {
  const c = contexto({ falharHistorico: true }); const antes = clone(c.estado());
  await assert.rejects(c.alterar({ acao: 'pagar' }), /histórico indisponível/); assert.deepEqual(c.estado(), antes);
});
test('vínculo por CNPJ é isolado por usuário e idempotente, sem duplicar negociação', async () => {
  const c = contexto({ vinculado: false });
  await c.integracao.vincularContratoFunil(c.tx, 'u1', 'c1');
  await c.integracao.vincularContratoFunil(c.tx, 'u1', 'c1');
  assert.equal(c.estado().contratos[0].leadId, 'l1'); assert.equal(c.estado().leads.length, 1);
  assert.equal(c.estado().acordos.length, 0);
});
test('sem documento ou com homônimo não vincula por nome nem exige CNPJ para pagar contrato', async () => {
  const c = contexto({ vinculado: false }); c.estado().contratos[0].cliente.cpf = null;
  await c.integracao.vincularContratoFunil(c.tx, 'u1', 'c1');
  assert.equal(c.estado().contratos[0].leadId, 'l2'); assert.equal(c.projetar().cnpj, '');
  assert.equal((await c.alterar({ acao: 'pagar' })).status, 200);
});
test('contratos legados quitados sem valorPago mantêm quitação e recusam novo pagamento', async () => {
  const c = contexto(); c.estado().parcelas[0].status = 'pago';
  assert.equal(c.projetar().parcelas[0].pagoCentavos, 10000);
  assert.equal((await c.alterar({ acao: 'pagar' })).status, 409);
});
