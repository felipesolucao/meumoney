import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(fs.readFileSync(new URL('../lib/negociacoesDiarias.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
const base = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(new URL('../lib/negociacoes.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(base, base.exports);
new Function('require', 'module', 'exports', output)(() => base.exports, mod, mod.exports);
const { resumoNegociacoesDiarias, percentualNegociado } = mod.exports;
const acordo = (cnpj, dataNegociacao, totalCentavos, pagoCentavos = 0) => ({ cnpj, dataNegociacao, totalCentavos, parcelas: [{ vencimento: '2027-01-01', valorCentavos: totalCentavos, pagoCentavos, dataPagamento: '2026-10-05' }] });
test('agrupa pela negociação e inclui parcelas futuras e saldo após pagamentos parciais', () => {
  const lista = [acordo('11111111111111', '2026-10-02', 10001, 2000), acordo('22222222222222', '2026-09-30', 9000), acordo('33333333333333', '2026-11-01', 9000)];
  const antes = JSON.stringify(lista);
  assert.deepEqual(resumoNegociacoesDiarias(lista, '2026-10', '2026-10-14'), { empresas: 1, negociado: 10001, pago: 2000, aReceber: 8001, emAtraso: 0, dias: [{ data: '2026-10-02', empresas: 1, negociado: 10001, pago: 2000, aReceber: 8001, emAtraso: 0 }] });
  assert.equal(JSON.stringify(lista), antes);
});
test('deduplica CNPJ por dia e no mês, soma acordos distintos e ordena datas', () => {
  const resumo = resumoNegociacoesDiarias([acordo('11.111.111/1111-11', '2026-10-03', 100), acordo('11111111111111', '2026-10-01', 200, 200), acordo('11111111111111', '2026-10-01', 300), acordo('22222222222222', '2026-10-01', 400)], '2026-10');
  assert.equal(resumo.empresas, 2);
  assert.deepEqual(resumo.dias.map(d => [d.data, d.empresas, d.negociado, d.aReceber]), [['2026-10-01', 2, 900, 700], ['2026-10-03', 1, 100, 100]]);
  assert.equal(resumo.negociado, 1000); assert.equal(resumo.aReceber, 800);
});
test('mês vazio, inválido ou sem acordos retorna totais zerados', () => {
  for (const mes of ['', '2026-13', '2027-01']) assert.deepEqual(resumoNegociacoesDiarias([acordo('11111111111111', '2026-10-01', 100)], mes), { empresas: 0, negociado: 0, pago: 0, aReceber: 0, emAtraso: 0, dias: [] });
});
test('acréscimos recebidos não compensam o saldo de outros acordos no dia ou mês', () => {
  const resumo = resumoNegociacoesDiarias([
    acordo('11111111111111', '2026-10-02', 100, 150),
    acordo('22222222222222', '2026-10-02', 200, 0),
  ], '2026-10');
  assert.equal(resumo.pago, 150);
  assert.equal(resumo.aReceber, 200);
  assert.equal(resumo.dias[0].aReceber, 200);
});

test('atraso soma apenas saldo vencido, sem compensar acréscimos de outra parcela', () => {
  const n = acordo('11111111111111', '2026-10-02', 60000);
  n.parcelas = [
    { vencimento: '2026-10-01', valorCentavos: 10000, pagoCentavos: 2500 },
    { vencimento: '2026-10-02', valorCentavos: 10000, pagoCentavos: 12000 },
    { vencimento: '2026-10-03', valorCentavos: 10000, pagoCentavos: 10000 },
    { vencimento: '2026-10-14', valorCentavos: 10000, pagoCentavos: 0 },
    { vencimento: '2026-11-01', valorCentavos: 10000, pagoCentavos: 0 },
    { vencimento: '', valorCentavos: 10000, pagoCentavos: 0 },
  ];
  const outro = acordo('22222222222222', '2026-10-03', 10000);
  outro.parcelas[0].vencimento = '2026-10-13';
  const foraDoMes = { ...outro, dataNegociacao: '2026-09-30' };
  const resumo = resumoNegociacoesDiarias([n, outro, foraDoMes], '2026-10', '2026-10-14');
  assert.equal(resumo.emAtraso, 17500);
  assert.equal(resumo.aReceber, 47500);
  assert.deepEqual(resumo.dias.map(d => d.emAtraso), [7500, 10000]);
  assert.equal(percentualNegociado(resumo.emAtraso, resumo.negociado), '25,00%');
  assert.equal(resumoNegociacoesDiarias([n], '2026-10', '2026-10-15').emAtraso, 17500);
});
test('percentuais usam o negociado, preservam acréscimos e evitam divisão por zero', () => {
  assert.equal(percentualNegociado(0, 0), '0,00%');
  assert.equal(percentualNegociado(1, 3), '33,33%');
  assert.equal(percentualNegociado(150, 100), '150,00%');
  assert.equal(percentualNegociado(100, 100), '100,00%');
});
