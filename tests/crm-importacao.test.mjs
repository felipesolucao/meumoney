import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => deps[id], mod, mod.exports);
  return mod.exports;
}
const core = load('lib/crmDebitos.ts');
const { criarIndiceEmpresas } = load('lib/crmIdentidade.ts', { './crmDebitos': core });
test('normaliza documentos e códigos, cobre repetições no lote e preserva homônimos identificados', () => {
  const indice = criarIndiceEmpresas([{ nome: 'A', codigo: '001', cnpj: '00.123.456/0001-99' }]);
  assert.ok(indice.contem({ nome: 'Outro', codigo: '1' }));
  assert.ok(indice.contem({ nome: 'Outro', cnpj: '00123456000199' }));
  assert.equal(indice.contem({ nome: 'A', codigo: '2' }), false);
  indice.adicionar({ nome: ' Empresa Á ' });
  assert.ok(indice.contem({ nome: 'empresa a' }));
});
