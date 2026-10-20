import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => { if (!(id in deps)) throw new Error(id); return deps[id]; }, mod, mod.exports);
  return mod.exports;
}
const lib = load('lib/negociacoes.ts');
function formulario(vencimento, onSalvar) {
  const dados = { empresa: 'Empresa', cnpj: '12345678000190', tipo: 'avista', dataNegociacao: '2020-01-01', debitoCentavos: 15000, totalCentavos: 12345, parcelasOriginais: 1, observacoes: '', parcelas: [{ ...lib.gerarParcelas(12345, 1, vencimento)[0], pagoCentavos: 500, dataPagamento: '2020-01-01' }] };
  let index = 0;
  const estados = [];
  const Component = load('components/crm/NegociacaoFormulario.tsx', {
    'react/jsx-runtime': jsx,
    react: { useEffect() {}, useRef: () => ({ current: null }), useState: initial => { const i = index++; estados[i] = i === 9 ? true : typeof initial === 'function' ? initial() : initial; return [estados[i], value => { estados[i] = value; }]; } },
    'react-dom': { createPortal: node => node }, '../Icons': { IconClose: () => null },
    './NegociacaoEmpresaBusca': { default: () => null }, '../../lib/negociacaoEmpresa': {}, '../../lib/negociacoes': lib,
  }).default;
  globalThis.document = { body: {} };
  try { return { tree: Component({ inicial: dados, onSalvar, onFechar() {} }), estados, dados }; }
  finally { delete globalThis.document; }
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
test('Pago grava o total combinado na data combinada, sem somar o pagamento parcial', async () => {
  let salvo;
  const { tree, dados } = formulario('2020-02-10', async valor => { salvo = valor; });
  const button = nodes(tree).find(n => n.type === 'button' && n.props.children === 'Pago');
  button.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(salvo.parcelas[0].pagoCentavos, 12345);
  assert.equal(salvo.parcelas[0].dataPagamento, '2020-02-10');
  assert.equal(dados.parcelas[0].pagoCentavos, 500);
  assert.equal(lib.statusNegociacao(salvo), 'pago');
  const campos = nodes(tree).filter(n => n.type === 'input');
  assert.ok(campos.some(n => n.props['aria-label'] === 'Total pago parcela 1' && typeof n.props.onChange === 'function'));
  assert.ok(campos.some(n => n.props['aria-label'] === 'Data pagamento parcela 1' && typeof n.props.onChange === 'function'));
});
test('Pago mantém a restrição de datas futuras sem gravar', async () => {
  let chamadas = 0;
  const { tree, estados } = formulario('2099-02-10', async () => { chamadas++; });
  nodes(tree).find(n => n.type === 'button' && n.props.children === 'Pago').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(chamadas, 0);
  assert.match(estados[6], /vencimento até hoje/);
});
test('falha ao salvar mantém os dados e permite tentar novamente', async () => {
  const { tree, estados, dados } = formulario('2020-02-10', async () => { throw new Error('Falha ao salvar'); });
  nodes(tree).find(n => n.type === 'button' && n.props.children === 'Pago').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(estados[6], /Falha ao salvar/);
  assert.equal(estados[7], false);
  assert.equal(estados[0], dados);
  assert.equal(estados[0].parcelas[0].pagoCentavos, 500);
});
