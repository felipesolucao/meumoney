import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { NextResponse } from 'next/server.js';
const js = ts.transpileModule(fs.readFileSync(new URL('../app/api/parcelas/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
async function consulta(query, usuario = 'u1') {
  let filtro;
  const mod = { exports: {} };
  const deps = {
    'next/server': { NextResponse },
    '../../../lib/auth': { obterSessao: async () => usuario ? { id: usuario } : null },
    '../../../lib/prisma': { prisma: { parcela: { findMany: async args => { filtro = args.where; return []; } } } },
  };
  new Function('require', 'module', 'exports', js)(id => deps[id], mod, mod.exports);
  const response = await mod.exports.GET({ url: `https://example.com/api/parcelas?${query}` });
  return { filtro, response };
}
test('recebidas usa pagamento incluindo todo o último dia e pagamentos parciais', async () => {
  const { filtro } = await consulta('status=pago&de=2026-10-01&ate=2026-10-31');
  assert.equal(filtro.contrato.usuarioId, 'u1');
  assert.equal(filtro.vencimento, undefined);
  assert.equal(filtro.pagoEm.gte.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(filtro.pagoEm.lt.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.deepEqual(filtro.OR, [{ valorPago: { gt: 0 } }, { status: 'pago', valorPago: null }]);
});
test('pendentes preserva vencimento e consulta exige sessão', async () => {
  const { filtro } = await consulta('status=pendente&de=2026-10-01&ate=2026-10-31');
  assert.equal(filtro.pagoEm, undefined);
  assert.equal(filtro.vencimento.lt.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.deepEqual(filtro.status, { not: 'pago' });
  const semSessao = await consulta('status=pago', null);
  assert.equal(semSessao.response.status, 401);
  assert.equal(semSessao.filtro, undefined);
});
