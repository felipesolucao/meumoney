import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { NextResponse } from 'next/server.js';

function load(file, dependencies = {}) {
  const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)((id) => { if (!(id in dependencies)) throw new Error(id); return dependencies[id]; }, mod, mod.exports);
  return mod.exports;
}
const { valoresRecebivel, resumoRecebiveis, mensagemRecebivel, linkWhatsApp } = load('lib/recebiveis.ts');
const item = { id: 'r1', descricao: 'Serviço de manutenção', valor: '100.00', valorPago: '25.00', status: 'pendente', tipo: 'receita', dataVencimento: '2026-09-11T00:00:00Z', numeroParcela: 1, recorrenteId: 'serie1' };
const detalhe = { selecionado: item, ocorrencias: [item, { ...item, id: 'r2', numeroParcela: 2, valorPago: null, dataVencimento: '2026-10-11T00:00:00Z' }], recorrencia: { periodicidade: 'mensal', tipoFim: 'parcelas' } };

test('resumo soma pagamentos parciais e quitação antiga sem valorPago, com centavos', () => {
  assert.deepEqual(valoresRecebivel(item), { total: 100, recebido: 25, restante: 75 });
  assert.deepEqual(resumoRecebiveis([item, { ...item, status: 'pago', valorPago: null }, { ...item, valor: '.30', valorPago: '.10' }]), { total: 200.3, recebido: 125.1, restante: 75.2 });
});
test('cobrança usa apenas o saldo da transação selecionada e mantém data brasileira', () => {
  const mensagem = mensagemRecebivel(detalhe, 'Ana Silva', 'cobranca');
  assert.match(mensagem, /Ana Silva/);
  assert.match(mensagem, /75,00/);
  assert.match(mensagem, /11\/09\/2026/);
  assert.doesNotMatch(mensagem, /175,00/);
});
test('recebível quitado gera confirmação em vez de cobrança', () => {
  const mensagem = mensagemRecebivel({ ...detalhe, selecionado: { ...item, valorPago: '100', status: 'pago' } }, '', 'cobranca');
  assert.match(mensagem, /Confirmamos o recebimento/);
  assert.doesNotMatch(mensagem, /Saldo a receber/);
});
test('proposta inclui cronograma, recebimentos e total; recorrência sem fim não promete total definitivo', () => {
  const mensagem = mensagemRecebivel({ ...detalhe, recorrencia: { tipoFim: 'sem_fim' } }, 'Ana', 'proposta');
  assert.match(mensagem, /proposta de contrato/);
  assert.match(mensagem, /200,00/);
  assert.match(mensagem, /175,00/);
  assert.match(mensagem, /11\/10\/2026/);
  assert.match(mensagem, /apenas as ocorrências já cadastradas/);
  assert.doesNotMatch(mensagem, /juros|emprestado/);
});
test('WhatsApp normaliza DDD sem duplicar 55, preserva internacional e codifica mensagem', () => {
  for (const numero of ['(11) 99999-1234', '+55 (11) 99999-1234', '5511999991234']) assert.equal(new URL(linkWhatsApp(numero, 'Olá & Ana!')).pathname, '/5511999991234');
  assert.equal(new URL(linkWhatsApp('+1 202 555 1234', 'Olá & Ana!')).pathname, '/12025551234');
  assert.equal(new URL(linkWhatsApp('', 'Olá & Ana!')).searchParams.get('text'), 'Olá & Ana!');
  assert.throws(() => linkWhatsApp('123', 'teste'));
});

function api({ autenticado = true, encontrado = true, serie = true } = {}) {
  const consultas = [];
  return { consultas, ...load('app/api/recebiveis/[id]/route.ts', {
    'next/server': { NextResponse }, '../../../../lib/auth': { obterSessao: async () => autenticado ? { id: 'u1' } : null },
    '../../../../lib/prisma': { prisma: { lancamento: {
      findFirst: async (query) => { consultas.push(query); return encontrado ? { ...item, recorrenteId: serie ? 'serie1' : null, recorrente: serie ? detalhe.recorrencia : null } : null; },
      findMany: async (query) => { consultas.push(query); return detalhe.ocorrencias; },
    } } },
  }) };
}
test('API exige autenticação e retorna 404 para despesa ou recebível de outro usuário', async () => {
  const semSessao = api({ autenticado: false });
  assert.equal((await semSessao.GET({}, { params: { id: 'r1' } })).status, 401);
  assert.equal(semSessao.consultas.length, 0);
  const semRegistro = api({ encontrado: false });
  assert.equal((await semRegistro.GET({}, { params: { id: 'r1' } })).status, 404);
  assert.deepEqual(semRegistro.consultas[0].where, { id: 'r1', usuarioId: 'u1', tipo: 'receita' });
});
test('API carrega somente ocorrências de receita da mesma série e do mesmo usuário', async () => {
  const s = api(); const res = await s.GET({}, { params: { id: 'r1' } });
  assert.equal(res.status, 200);
  assert.deepEqual(s.consultas[1].where, { recorrenteId: 'serie1', usuarioId: 'u1', tipo: 'receita' });
  assert.equal((await res.json()).ocorrencias.length, 2);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});
test('API de recebível avulso não busca parcelas de outras transações', async () => {
  const s = api({ serie: false }); const body = await (await s.GET({}, { params: { id: 'r1' } })).json();
  assert.equal(s.consultas.length, 1); assert.equal(body.ocorrencias.length, 1); assert.equal(body.recorrencia, null);
});
