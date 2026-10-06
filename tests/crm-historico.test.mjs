import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, dependencies = {}) {
  const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => { if (!(id in dependencies)) throw new Error(id); return dependencies[id]; }, mod, mod.exports);
  return mod.exports;
}
const comparacao = load('lib/crmHistorico.ts');
const historico = load('lib/crmHistoricoServidor.ts', { './crmHistorico': comparacao });
const { semMovimento, diasParado } = load('lib/crm.ts');
function fixture({ usuario = 'u1', falharLog = false } = {}) {
  let estado = { lead: { id: 'l1', usuarioId: 'u1', nome: 'Empresa', estagio: 'primeira_tentativa', observacoes: null, movimentadoEm: new Date('2020-01-01'), dataUltimoContato: null }, logs: [], atendimentos: [] };
  const clone = v => globalThis.structuredClone(v);
  const db = () => ({
    leadCrm: {
      findFirst: async ({ where }) => where.usuarioId === estado.lead.usuarioId ? clone(estado.lead) : null,
      findUniqueOrThrow: async () => clone(estado.lead),
      update: async ({ data }) => { Object.assign(estado.lead, data); return clone(estado.lead); },
    },
    historicoCrm: { create: async ({ data }) => { if (falharLog) throw new Error('Falha no log'); estado.logs.push(clone(data)); return data; }, findMany: async () => clone(estado.logs) },
    atendimentoCrm: {
      findFirst: async ({ where }) => where.id ? clone(estado.atendimentos.find(a => a.id === where.id)) : clone(estado.atendimentos.sort((a,b) => b.dataTratativa - a.dataTratativa)[0] ?? null),
      findUniqueOrThrow: async ({ where }) => clone(estado.atendimentos.find(a => a.id === where.id)),
      create: async ({ data }) => { const a = { id: 'a1', ...data }; estado.atendimentos.push(a); return clone(a); },
      update: async ({ where, data }) => { const a = estado.atendimentos.find(a => a.id === where.id); Object.assign(a,data); return clone(a); },
      delete: async ({ where }) => { const a = estado.atendimentos.find(a => a.id === where.id); estado.atendimentos = estado.atendimentos.filter(a => a.id !== where.id); return clone(a); },
    },
  });
  const prisma = { ...db(), $transaction: async fn => { const antes = clone(estado); try { return await fn(db()); } catch(e) { estado = antes; throw e; } } };
  const rota = (file, prefix) => load(file, {
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    [`${prefix}/prisma`]: { prisma }, [`${prefix}/auth`]: { obterSessao: async () => usuario ? { id: usuario, nome: 'Responsável' } : null },
    [`${prefix}/crmHistorico`]: comparacao, [`${prefix}/crmHistoricoServidor`]: historico,
    [`${prefix}/crmAutomacao`]: { estagiosValidosDoUsuario: async () => new Set(['primeira_tentativa','em_negociacao']), aplicarAutomacoes: async (_u, lead) => lead },
  });
  return { estado: () => estado, perfil: rota('app/api/crm/leads/[id]/route.ts', '../../../../../lib'),
    atendimentos: rota('app/api/crm/leads/[id]/atendimentos/route.ts', '../../../../../../lib'),
    atendimento: rota('app/api/crm/leads/[id]/atendimentos/[atendimentoId]/route.ts', '../../../../../../../lib'),
    logs: rota('app/api/crm/leads/[id]/historico/route.ts', '../../../../../../lib') };
}
const params = { params: { id: 'l1', atendimentoId: 'a1' } };
const json = data => ({ json: async () => data });
const novo = () => ({ formData: async () => new Map([['observacao','Ligação'], ['dataTratativa','2020-01-02'], ['arquivo',null]]) });
test('edição de perfil zera dias e remove empresa do totalizador, com antes/depois', async () => {
  const f = fixture(); assert.equal(semMovimento(f.estado().lead.movimentadoEm),true);
  assert.equal((await f.perfil.PATCH(json({ observacoes:'Retornar amanhã' }),params)).status,200);
  assert.equal(diasParado(f.estado().lead.movimentadoEm),0); assert.equal(semMovimento(f.estado().lead.movimentadoEm),false);
  assert.deepEqual(f.estado().logs[0].alteracoes,[{ campo:'observacoes',antes:null,depois:'Retornar amanhã' }]);
});
test('salvar sem mudanças ou reordenar posição não renova atividade nem cria logs', async () => {
  const f = fixture(); await f.perfil.PATCH(json({ nome:' Empresa ', ordem:3 }),params);
  assert.equal(f.estado().logs.length,0); assert.equal(semMovimento(f.estado().lead.movimentadoEm),true);
  assert.deepEqual(comparacao.compararCamposCrm({valorEmAberto:'100.00'},{valorEmAberto:100,arquivoDados:'segredo'}),[]);
});
test('troca de grupo preserva origem e destino no log', async () => {
  const f = fixture(); await f.perfil.PATCH(json({estagio:'em_negociacao'}),params);
  assert.deepEqual(f.estado().logs[0].alteracoes,[{campo:'estagio',antes:'primeira_tentativa',depois:'em_negociacao'}]);
});
test('atendimento retroativo movimenta agora; edições e exclusões preservam auditoria', async () => {
  const f = fixture(); await f.atendimentos.POST(novo(), params);
  assert.equal(diasParado(f.estado().lead.movimentadoEm),0);
  assert.equal(f.estado().lead.dataUltimoContato.toISOString(),'2020-01-02T00:00:00.000Z');
  await f.atendimento.PATCH(json({observacao:'Observação corrigida'}),params);
  await f.atendimento.DELETE({},params);
  assert.equal(f.estado().logs.length,3); assert.equal(f.estado().atendimentos.length,0);
  assert.equal(f.estado().lead.dataUltimoContato,null);
  assert.ok(f.estado().logs[2].alteracoes.some(a => a.antes === 'Observação corrigida' && a.depois === null));
});
test('falha no log reverte alteração e timestamp no cadastro e atendimento', async () => {
  const f = fixture({falharLog:true});
  await assert.rejects(f.perfil.PATCH(json({nome:'Alterado'}),params),/Falha no log/);
  assert.equal(f.estado().lead.nome,'Empresa'); assert.equal(semMovimento(f.estado().lead.movimentadoEm),true);
  await assert.rejects(f.atendimentos.POST(novo(),params),/Falha no log/);
  assert.equal(f.estado().atendimentos.length,0); assert.equal(f.estado().logs.length,0);
});
test('sessão e propriedade protegem edição e consulta do histórico', async () => {
  for (const [usuario,status] of [[null,401],['outro',404]]) {
    const f=fixture({usuario}); assert.equal((await f.perfil.PATCH(json({nome:'Alterado'}),params)).status,status);
    assert.equal((await f.logs.GET({nextUrl:new URL('http://localhost')},params)).status,status);
    assert.equal(f.estado().logs.length,0);
  }
});
test('limite de inatividade é estritamente mais de sete dias', () => {
  const agora=Date.now(), seteDias=7*86400000;
  assert.equal(semMovimento(new Date(agora-seteDias),agora),false);
  assert.equal(semMovimento(new Date(agora-seteDias-1),agora),true);
});

test('observação e atendimento retroativo preservam contato manual mais recente', async () => {
  const f = fixture();
  const contato = new Date('2026-01-01');
  f.estado().lead.dataUltimoContato = contato;
  await f.atendimentos.POST(novo(), params);
  assert.equal(f.estado().lead.dataUltimoContato.getTime(), contato.getTime());
  await f.atendimento.PATCH(json({observacao:'Texto revisado'}),params);
  assert.equal(f.estado().lead.dataUltimoContato.getTime(), contato.getTime());
});
