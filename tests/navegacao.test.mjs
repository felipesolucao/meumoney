import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../lib/navegacao.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', output)(mod, mod.exports);
const { caminhoRetorno, linkComRetorno } = mod.exports;

test('retorna para todas as abas e preserva período e mês', () => {
  for (const aba of ['hoje', 'amanha', 'atrasadas', 'por_data', 'recebidas', 'pendentes']) {
    const origem = `/parcelas?aba=${aba}&de=2026-10-15&ate=2026-10-31&ano=2026&mes=9`;
    const destino = new URL(linkComRetorno('/contratos/123', origem), 'https://example.com');
    assert.equal(caminhoRetorno(destino.searchParams.get('voltar'), '/contratos'), origem);
  }
});

test('preserva a cadeia lista → cliente → contrato → edição', () => {
  const cliente = linkComRetorno('/clientes/1', '/clientes?busca=Flor');
  const contrato = linkComRetorno('/contratos/2', cliente);
  const editar = linkComRetorno('/contratos/2/editar', contrato);
  const retorno = url => new URL(url, 'https://example.com').searchParams.get('voltar');
  assert.equal(retorno(editar), contrato);
  assert.equal(retorno(contrato), cliente);
  assert.equal(retorno(cliente), '/clientes?busca=Flor');
});

test('entrada direta usa fallback e retorno externo é rejeitado', () => {
  for (const valor of [null, '', 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com']) {
    assert.equal(caminhoRetorno(valor, '/clientes'), '/clientes');
  }
  assert.equal(caminhoRetorno('/parcelas?aba=atrasadas', '/clientes'), '/parcelas?aba=atrasadas');
});
