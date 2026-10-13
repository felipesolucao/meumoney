import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, dependencies = {}) {
  const js = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(id => dependencies[id], mod, mod.exports);
  return mod.exports;
}
test('notifica vencimento uma vez, ignora enviados e mantém aviso sem permissão', () => {
  const originais = Object.fromEntries(['window', 'document', 'Notification', 'localStorage'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const avisos = []; const storage = new Map(); let tick; let limpar;
  const eventos = new Map();
  const react = { useState: () => [Date.now(), () => {}], useRef: () => ({ current: new Set() }), useEffect: fn => { limpar = fn(); } };
  function Notification(titulo, opcoes) { avisos.push({ titulo, ...opcoes }); }
  Notification.permission = 'granted';
  try {
    Object.assign(globalThis, {
      window: { Notification, setInterval: fn => { tick = fn; return 1; }, clearInterval: () => {}, addEventListener: (k, fn) => eventos.set(k, fn), removeEventListener: k => eventos.delete(k) },
      document: { addEventListener: () => {}, removeEventListener: () => {} }, Notification,
      localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
    });
    const useTimers = load('components/crm/useBoletoTimers.ts', { react, '../../lib/boletoTimer': load('lib/boletoTimer.ts') }).default;
    const lista = [
      { id: '1', empresa: 'Empresa A', boletoLembreteEm: new Date(Date.now() - 1000).toISOString() },
      { id: '2', empresa: 'Empresa B', boletoEnviado: true, boletoLembreteEm: new Date(Date.now() - 1000).toISOString() },
      { id: '3', empresa: 'Empresa C' },
      { id: '4', empresa: 'Empresa D', boletoLembreteEm: new Date(Date.now() + 600000).toISOString() },
    ];
    assert.equal(useTimers(lista).vencidos.length, 1);
    tick(); eventos.get('focus')();
    assert.equal(avisos.length, 1);
    assert.match(avisos[0].body, /Empresa A/);
    limpar(); useTimers(lista); assert.equal(avisos.length, 1); // recarregamento
    Notification.permission = 'denied'; storage.clear(); limpar();
    assert.equal(useTimers(lista).vencidos.length, 1);
    tick(); assert.equal(avisos.length, 1);
    limpar(); assert.equal(eventos.size, 0);
  } finally {
    for (const [k, descriptor] of Object.entries(originais)) { if (descriptor) Object.defineProperty(globalThis, k, descriptor); else Reflect.deleteProperty(globalThis, k); }
  }
});
