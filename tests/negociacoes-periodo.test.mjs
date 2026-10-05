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
test('sem data de pagamento, mês é definido pelo vencimento, não pela criação do acordo', () => {
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

for (const tipo of ['avista', 'parcelada']) {
  for (const pagoCentavos of [500, 1000]) {
    test(`${tipo}: pagamento de ${pagoCentavos} transfere somente a parcela para outro mês/ano`, () => {
      const paga = { numero: 1, vencimento: '2026-12-10', valorCentavos: 1000, pagoCentavos, dataPagamento: '2027-01-05' };
      const pendente = { numero: 2, vencimento: '2026-12-20', valorCentavos: 2000, pagoCentavos: 0, dataPagamento: '' };
      const acordo = { ...n, tipo, parcelas: tipo === 'avista' ? [paga] : [paga, pendente] };
      const original = JSON.stringify(acordo);
      const destino = negociacoesDoMes([acordo], '2027-01');
      assert.deepEqual(destino[0].parcelas, [paga]);
      assert.equal(destino[0].totalCentavos, 1000);
      assert.equal(destino[0].totalParcelasAcordo, acordo.parcelas.length);
      assert.deepEqual(negociacoesDoMes([acordo], '2026-12').flatMap(n => n.parcelas), tipo === 'avista' ? [] : [pendente]);
      assert.deepEqual(negociacoesDoMes(destino, '2027-01'), destino);
      assert.equal(JSON.stringify(acordo), original);
    });
  }
}
test('pagamento antecipado e parcela paga sem vencimento usam a data do pagamento', () => {
  for (const vencimento of ['2026-11-01', '']) {
    const parcela = { numero: 1, vencimento, valorCentavos: 1000, pagoCentavos: 1000, dataPagamento: '2026-09-01' };
    assert.deepEqual(negociacoesDoMes([{ ...n, parcelas: [parcela] }], '2026-09')[0].parcelas, [parcela]);
  }
});
test('remover pagamento devolve parcela ao mês do vencimento', () => {
  const parcela = { numero: 1, vencimento: '2026-11-01', valorCentavos: 1000, pagoCentavos: 0, dataPagamento: '2026-09-01' };
  assert.deepEqual(negociacoesDoMes([{ ...n, parcelas: [parcela] }], '2026-09'), []);
  assert.deepEqual(negociacoesDoMes([{ ...n, parcelas: [parcela] }], '2026-11')[0].parcelas, [parcela]);
});
