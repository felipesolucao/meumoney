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

test('histórico completo preserva contratos quitados, acordos antigos e parcelas sem data', () => {
  const contrato = { ...n, id: 'contrato:c1', contratoId: 'c1', parcelas: [
    { numero: 1, vencimento: '2026-09-10', valorCentavos: 2500, pagoCentavos: 2500, dataPagamento: '2026-10-01' },
  ], totalCentavos: 2500 };
  const entrada = [n, contrato];
  const antes = JSON.stringify(entrada);
  const resultado = mod.exports.negociacoesDoPeriodo(entrada, null);
  assert.equal(resultado.length, 2);
  assert.equal(resultado.reduce((s, item) => s + item.totalCentavos, 0), 12500);
  assert.equal(resultado.reduce((s, item) => s + item.parcelas.reduce((t, p) => t + p.pagoCentavos, 0), 0), 4000);
  assert.equal(resultado[0].parcelas.length, 4);
  assert.equal(resultado[1].totalParcelasAcordo, 1);
  assert.equal(JSON.stringify(entrada), antes);
  const mensal = mod.exports.negociacoesDoPeriodo(entrada, '2026-10');
  assert.equal(mensal.length, 2);
  assert.equal(mensal[1].parcelas[0].dataPagamento, '2026-10-01');
});


test('recebimentos usa exclusivamente pagamento e inclui parciais de contratos antigos', () => {
  const entrada = [{ ...n, contratoId: 'c1', parcelas: [
    { numero: 1, valorCentavos: 1000, pagoCentavos: 400, vencimento: '2026-09-01', dataPagamento: '2026-10-31' },
    { numero: 2, valorCentavos: 1000, pagoCentavos: 1000, vencimento: '2026-10-10', dataPagamento: '2026-09-30' },
    { numero: 3, valorCentavos: 1000, pagoCentavos: 0, vencimento: '2026-10-01', dataPagamento: '' },
    { numero: 4, valorCentavos: 1000, pagoCentavos: 1000, vencimento: '2026-10-01', dataPagamento: '' },
  ] }];
  const resultado = mod.exports.negociacoesDoPeriodo(entrada, '2026-10', 'recebimentos');
  assert.deepEqual(resultado[0].parcelas.map(p => p.numero), [1]);
  assert.equal(resultado[0].parcelas[0].pagoCentavos, 400);
  assert.equal(resultado[0].totalParcelasAcordo, 4);
  assert.deepEqual(negociacoesDoMes(resultado, '2026-10', 'recebimentos'), resultado);
});

test('busca localiza nome com acentos, nome do funil, documento formatado e contrato', () => {
  const acordo = { ...n, empresa: 'Soluções Águia', cnpj: '00123456000199', lead: { nome: 'Nome comercial' }, codigoContrato: '#C-123' };
  for (const busca of ['solucoes aguia', '  ÁGUIA ', 'nome comercial', '00.123.456/0001-99', '#C-123', ''])
    assert.equal(mod.exports.correspondeBuscaNegociacao(acordo, busca), true, busca);
  assert.equal(mod.exports.correspondeBuscaNegociacao(acordo, 'outra empresa'), false);
});

test('novas negociações de novembro aparecem pela data do acordo antes de qualquer pagamento', () => {
  const nova = { ...n, dataNegociacao: '2026-11-04', parcelas: [
    { numero: 1, vencimento: '2026-12-10', valorCentavos: 10000, pagoCentavos: 0, dataPagamento: '' },
  ] };
  const antes = JSON.stringify(nova);
  const resultado = mod.exports.negociacoesDoPeriodo([nova], '2026-11', 'negociacoes');
  assert.equal(resultado.length, 1); assert.equal(resultado[0].totalCentavos, 10000);
  assert.deepEqual(resultado[0].parcelas, nova.parcelas);
  assert.deepEqual(mod.exports.negociacoesDoPeriodo([nova], '2026-11', 'recebimentos'), []);
  assert.deepEqual(mod.exports.negociacoesDoPeriodo([nova], '2026-12', 'negociacoes'), []);
  assert.equal(JSON.stringify(nova), antes);
});
test('mês do acordo inclui negociações sem vencimento e mantém o cronograma completo', () => {
  const acordo = { ...n, dataNegociacao: '2026-11-30' };
  const resultado = negociacoesDoMes([acordo], '2026-11', 'negociacoes');
  assert.equal(resultado[0].parcelas.length, 4); assert.equal(resultado[0].totalParcelasAcordo, 4);
  assert.deepEqual(negociacoesDoMes(resultado, '2026-11', 'negociacoes'), resultado);
  assert.deepEqual(negociacoesDoMes([acordo], '2027-11', 'negociacoes'), []);
});
