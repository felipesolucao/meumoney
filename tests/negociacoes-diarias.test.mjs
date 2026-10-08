import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(fs.readFileSync(new URL('../lib/negociacoesDiarias.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
const base = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(new URL('../lib/negociacoes.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(base, base.exports);
new Function('require', 'module', 'exports', output)(() => base.exports, mod, mod.exports);
const { resumoNegociacoesDiarias } = mod.exports;
const acordo = (cnpj, dataNegociacao, totalCentavos, pagoCentavos = 0) => ({ cnpj, dataNegociacao, totalCentavos, parcelas: [{ vencimento: '2027-01-01', valorCentavos: totalCentavos, pagoCentavos, dataPagamento: '2026-10-05' }] });
test('agrupa pela negociação e inclui parcelas futuras e saldo após pagamentos parciais', () => {
  const lista = [acordo('11111111111111', '2026-10-02', 10001, 2000), acordo('22222222222222', '2026-09-30', 9000), acordo('33333333333333', '2026-11-01', 9000)];
  const antes = JSON.stringify(lista);
  assert.deepEqual(resumoNegociacoesDiarias(lista, '2026-10'), { empresas: 1, negociado: 10001, pago: 2000, aReceber: 8001, dias: [{ data: '2026-10-02', empresas: 1, negociado: 10001, pago: 2000, aReceber: 8001 }] });
  assert.equal(JSON.stringify(lista), antes);
});
test('deduplica CNPJ por dia e no mês, soma acordos distintos e ordena datas', () => {
  const resumo = resumoNegociacoesDiarias([acordo('11.111.111/1111-11', '2026-10-03', 100), acordo('11111111111111', '2026-10-01', 200, 200), acordo('11111111111111', '2026-10-01', 300), acordo('22222222222222', '2026-10-01', 400)], '2026-10');
  assert.equal(resumo.empresas, 2);
  assert.deepEqual(resumo.dias.map(d => [d.data, d.empresas, d.negociado, d.aReceber]), [['2026-10-01', 2, 900, 700], ['2026-10-03', 1, 100, 100]]);
  assert.equal(resumo.negociado, 1000); assert.equal(resumo.aReceber, 800);
});
test('mês vazio, inválido ou sem acordos retorna totais zerados', () => {
  for (const mes of ['', '2026-13', '2027-01']) assert.deepEqual(resumoNegociacoesDiarias([acordo('11111111111111', '2026-10-01', 100)], mes), { empresas: 0, negociado: 0, pago: 0, aReceber: 0, dias: [] });
});
