import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { NextResponse } from 'next/server.js';

const require = createRequire(import.meta.url);
function setup({ authenticated = true, owned = true, total = 50, linked = true, auditFails = false, contratos = [] } = {}) {
  let state = { fatura: { id: 'f1', cartaoId: 'c1', status: 'fechada', valorTotal: total, lancamentoId: linked ? 'l1' : null, mesReferencia: 8, anoReferencia: 2026, dataVencimento: new Date(), cartao: { nome: 'Cartão', origem: 'pessoal', contaId: 'a1' } },
    conta: { id: 'a1', nome: 'Conta', saldoInicial: 100 }, rows: linked ? [{ id: 'l1', valor: total, status: 'pendente', tipo: 'despesa', usuarioId: 'u1', contaId: 'a1' }] : [], audits: [] };
  const db = {
    contrato: { findMany: async ({ where }) => { assert.equal(where.usuarioId, 'u1'); return contratos; } },
    faturaCartao: {
      findFirst: async ({ where }) => { assert.equal(where.cartao.usuarioId, 'u1'); assert.equal(where.cartaoId, 'c1'); return owned ? { ...state.fatura } : null; },
      update: async ({ data }) => Object.assign(state.fatura, data),
    },
    conta: {
      findFirst: async ({ where }) => { assert.equal(where.usuarioId, 'u1'); return owned ? { ...state.conta } : null; },
      update: async ({ data }) => Object.assign(state.conta, data),
    },
    lancamento: {
      findFirst: async ({ where }) => state.rows.find(r => r.id === where.id && r.usuarioId === where.usuarioId),
      findMany: async () => state.rows.filter(r => r.status === 'pago'),
      create: async ({ data }) => { const row = { id: `l${state.rows.length + 1}`, ...data }; state.rows.push(row); return row; },
      update: async ({ where, data }) => { const i = state.rows.findIndex(r => r.id === where.id); state.rows[i] = { ...state.rows[i], ...data }; return state.rows[i]; },
    },
    $transaction: async (run, options) => {
      assert.equal(options.isolationLevel, 'Serializable');
      const before = JSON.parse(JSON.stringify(state));
      try { return await run(db); } catch (error) { state = before; throw error; }
    },
  };
  function load(file) {
    const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', output)((id) => {
      if (id === 'next/server') return { NextResponse };
      if (id.endsWith('/prisma')) return { prisma: db };
      if (id.endsWith('/auth')) return { obterSessao: async () => authenticated ? { id: 'u1' } : null };
      if (id.endsWith('/historico')) return { registrarAcao: async (_, action) => { if (auditFails) throw new Error('audit'); state.audits.push(action); } };
      return require(id);
    }, mod, mod.exports);
    return mod.exports;
  }
  const faturas = load('app/api/cartoes/[id]/faturas/[faturaId]/route.ts');
  const contas = load('app/api/contas/[id]/reajustar/route.ts');
  const request = body => ({ json: async () => body });
  return { state: () => state,
    pagar: (acao = 'pagar') => faturas.PATCH(request({ acao }), { params: { id: 'c1', faturaId: 'f1' } }),
    ajustar: (novoSaldo, modo = 'transacao', saldoEsperado = 100) => contas.POST(request({ novoSaldo, modo, saldoEsperado }), { params: { id: 'a1' } }),
  };
}

test('pagamento e reabertura atualizam fatura, débito e histórico; repetição não duplica', async () => {
  const s = setup();
  assert.equal((await s.pagar()).status, 200);
  assert.equal(s.state().fatura.status, 'paga');
  assert.equal(s.state().rows[0].valorPago, 50);
  await s.pagar();
  assert.equal(s.state().audits.length, 1);
  await s.pagar('reabrir');
  assert.equal(s.state().fatura.status, 'fechada');
  assert.equal(s.state().rows[0].valorPago, null);
});
test('fatura sem lançamento é reparada; fatura vazia paga e reabre sem débito', async () => {
  for (const total of [0, 70]) {
    const s = setup({ linked: false, total });
    assert.equal((await s.pagar()).status, 200);
    assert.equal(s.state().rows.length, total ? 1 : 0);
    assert.equal(s.state().fatura.status, 'paga');
    await s.pagar('reabrir');
    assert.equal(s.state().fatura.status, 'fechada');
  }
});
test('sessão e propriedade são exigidas nos dois endpoints', async () => {
  for (const options of [{ authenticated: false }, { owned: false }]) {
    const s = setup(options); const expected = options.authenticated === false ? 401 : 404;
    assert.equal((await s.pagar()).status, expected);
    assert.equal((await s.ajustar(200)).status, expected);
    assert.equal(s.state().audits.length, 0);
  }
});
test('reajuste cria receita ou despesa paga somente pela diferença e aceita negativo/zero', async () => {
  for (const target of [150.25, 80, 0, -20]) {
    const s = setup({ linked: false });
    assert.equal((await s.ajustar(target)).status, 200);
    const row = s.state().rows[0];
    assert.equal(row.valor.toNumber(), Math.abs(target - 100));
    assert.equal(row.tipo, target > 100 ? 'receita' : 'despesa');
    assert.equal(row.status, 'pago');
    assert.equal((await s.ajustar(target)).status, 200);
    assert.equal(s.state().rows.length, 1);
  }
});
test('modificar inicial considera movimentos pagos sem criar transação', async () => {
  const s = setup(); await s.pagar();
  assert.equal((await s.ajustar(80, 'inicial', 50)).status, 200);
  assert.equal(s.state().conta.saldoInicial.toNumber(), 130);
  assert.equal(s.state().rows.length, 1);
});
test('saldo desatualizado, valores e modo inválidos são rejeitados', async () => {
  const s = setup();
  assert.equal((await s.ajustar(200, 'transacao', 99)).status, 409);
  for (const value of [null, '200', Infinity, NaN, 10000000000]) assert.equal((await s.ajustar(value)).status, 400);
  assert.equal((await s.ajustar(200, 'ambos')).status, 400);
});
test('reajuste considera desembolso, conta de recebimento e fallback de parcelas antigas', async () => {
  const s = setup({ linked: false, contratos: [
    { contaDesembolsoId: 'a1', valorEmprestado: 80, parcelas: [{ status: 'pago', contaId: null, valorPago: 10, valor: 20 }, { status: 'pago', contaId: 'outra', valor: 30 }, { status: 'a_vencer', contaId: 'a1', valor: 40 }] },
    { contaDesembolsoId: null, valorEmprestado: 1000, parcelas: [{ status: 'pago', contaId: 'a1', valorPago: null, valor: 15 }] },
  ] });
  assert.equal((await s.ajustar(60, 'transacao', 45)).status, 200);
  assert.equal(s.state().rows[0].valor.toNumber(), 15);
});
test('falha no histórico reverte também o pagamento ou ajuste', async () => {
  const s = setup({ auditFails: true });
  assert.equal((await s.pagar()).status, 500);
  assert.equal(s.state().fatura.status, 'fechada');
  assert.equal(s.state().rows[0].status, 'pendente');
  assert.equal((await s.ajustar(200)).status, 500);
  assert.equal(s.state().rows.length, 1);
});
