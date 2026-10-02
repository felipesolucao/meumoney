import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(fs.readFileSync(new URL('../lib/negociacoesPeriodo.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', output)(mod, mod.exports);
const { negociacoesDoMes } = mod.exports;
const n = { id: 'n1', empresa: 'Empresa', dataNegociacao: '2026-08-01', totalCentavos: 10000, parcelas: [
  { numero: 1, vencimento: '2026-09-01', valorCentavos: 1000, pagoCentavos: 1000 },
  { numero: 2, vencimento: '2026-10-01', valorCentavos: 2000, pagoCentavos: 500 },
  { numero: 3, vencimento: '2026-11-01', valorCentavos: 3000, pagoCentavos: 0 },
  { numero: 4, vencimento: '', valorCentavos: 4000, pagoCentavos: 0 },
] };
test('mês é definido pelo vencimento, não pela criação do acordo ou pagamento', () => {
  const resultado = negociacoesDoMes([n], '2026-10');
  assert.equal(resultado.length, 1); assert.equal(resultado[0].totalCentavos, 2000);
  assert.deepEqual(resultado[0].parcelas.map(p => p.numero), [2]);
  assert.equal(resultado[0].totalParcelasAcordo, 4);
  assert.equal(negociacoesDoMes([n], '2026-08').length, 0);
  assert.deepEqual(negociacoesDoMes([n], '2026-11')[0].parcelas.map(p => p.numero), [3]);
});
test('projeção não modifica acordo original e pode ser reaplicada no Excel', () => {
  const antes = JSON.stringify(n);
  const resultado = negociacoesDoMes([n], '2026-10');
  assert.deepEqual(negociacoesDoMes(resultado, '2026-10'), resultado);
  assert.equal(JSON.stringify(n), antes); assert.equal(n.parcelas.length, 4);
});
test('mês vazio, inválido ou sem parcelas não expõe parcelas futuras', () => {
  for (const mes of ['', '2026', '2026-13', '2027-01']) assert.deepEqual(negociacoesDoMes([n], mes), []);
});
