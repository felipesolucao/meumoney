import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, dependencies = {}) {
  const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => dependencies[id], mod, mod.exports);
  return mod.exports;
}
const crm = load('lib/crm.ts');
const { aplicarFiltroColuna, agruparPorColuna } = load('lib/crmQuadro.ts', { './crm': crm });
const empresas = [
  { id:'a', nome:'Empresa A', quantidadeParcelas:2, valorEmAberto:'100.00', ordem:0 },
  { id:'b', nome:'Empresa B', quantidadeParcelas:10, valorEmAberto:'9.50', ordem:1 },
  { id:'c', nome:'Empresa C', quantidadeParcelas:null, valorEmAberto:null, ordem:2 },
  { id:'d', nome:'Empresa D', quantidadeParcelas:0, valorEmAberto:'0', ordem:3 },
];
test('todos os grupos, inclusive personalizados, ordenam numericamente sem excluir empresas', () => {
  const grupos = [...crm.ESTAGIOS.map(e => e.id), 'grupo_personalizado'];
  const mapa = agruparPorColuna(grupos.flatMap(estagio => empresas.map(e => ({...e, estagio}))));
  for (const lista of mapa.values()) {
    for (const [ordenacao, esperado] of Object.entries({ parcelas_desc:['b','a','d','c'], parcelas_asc:['d','a','b','c'], valor_desc:['a','b','d','c'], valor_asc:['d','b','a','c'] })) {
      assert.deepEqual(aplicarFiltroColuna(lista, { busca:'', ordenacao }).map(e=>e.id), esperado);
    }
    assert.deepEqual(lista.map(e=>e.id), ['a','b','c','d']);
    assert.deepEqual(aplicarFiltroColuna(lista, { busca:'', ordenacao:'manual' }).map(e=>e.id), ['a','b','c','d']);
  }
});
test('busca combina com ordenação e valores empatados mantêm a ordem manual', () => {
  assert.deepEqual(aplicarFiltroColuna(empresas, { busca:' empresa b ', ordenacao:'valor_desc' }).map(e=>e.id), ['b']);
  const empate = empresas.map(e=>({...e, quantidadeParcelas:2}));
  assert.deepEqual(aplicarFiltroColuna(empate, { busca:'', ordenacao:'parcelas_desc' }).map(e=>e.id), ['a','b','c','d']);
});
