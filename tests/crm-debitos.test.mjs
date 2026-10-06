import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import ExcelJS from 'exceljs';
import crypto from 'node:crypto';
function load(file, dependencies = {}) {
  const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => { if (!(id in dependencies)) throw new Error(id); return dependencies[id]; }, mod, mod.exports);
  return mod.exports;
}
const core = load('lib/crmDebitos.ts');
const { lerPlanilhaDebitos } = load('lib/crmDebitosExcel.ts', { exceljs: ExcelJS, './crmDebitos': core });
const empresa = (extra = {}) => ({ codigo: '1', nome: 'Empresa Á', cnpj: '00123456000199', valorEmAberto: '100.00', quantidadeParcelas: 1, parcelaMaisAntiga: '2026-01-01T00:00:00.000Z', parcelaMaisRecente: '2026-01-01T00:00:00.000Z', ...extra });
const lead = (extra = {}) => ({ ...empresa(), id: 'a', estagio: 'em_negociacao', atualizadoEm: '2026-10-01T00:00:00.000Z', ...extra });
async function xlsx(rows, resumo = false, configure = () => {}) {
  const w = new ExcelJS.Workbook(); const s = w.addWorksheet(resumo ? 'Resumo' : 'Detalhe');
  s.addRow(resumo ? ['Cod', 'Razão Social', 'CNPJ/CPF', 'Qtd. Parcelas', 'Valor Total em Aberto', 'Venc. Mais Antigo', 'Venc. Mais Recente'] : ['Cod', 'Razão Social', 'CNPJ/CPF', 'Dt Venc.', 'Vr. Doc.', 'Vr. Pag.', 'Dt Pag.', 'Tipo Baixa', 'Contribuição']);
  rows.forEach(r => s.addRow(r)); configure(w, s); return Buffer.from(await w.xlsx.writeBuffer());
}
const parcela = (value = 100, date = '01/01/2026', extra = []) => ['1', 'Empresa Á', '00.123.456/0001-99', date, value, ...extra];
test('agrupa parcelas, soma centavos e calcula extremos independentemente da ordem', async () => {
  const r = await lerPlanilhaDebitos(await xlsx([parcela(0.1, '12/03/2026'), parcela('R$ 1.234,56', '01/01/2026'), parcela(0.2, '01/02/2026')]));
  assert.equal(r.empresas.length, 1); assert.equal(r.linhas, 3); assert.equal(r.empresas[0].valorEmAberto, '1234.86');
  assert.equal(r.empresas[0].quantidadeParcelas, 3); assert.equal(r.empresas[0].parcelaMaisAntiga, '2026-01-01T00:00:00.000Z'); assert.equal(r.empresas[0].parcelaMaisRecente, '2026-03-12T00:00:00.000Z');
});
test('prioriza detalhe sobre resumo, preserva datas Excel e CNPJ com zeros', async () => {
  const r = await lerPlanilhaDebitos(await xlsx([parcela(100, new Date('2026-01-01T00:00:00Z'))], false, w => {
    const s = w.addWorksheet('Resumo'); s.addRow(['Cod','Razão Social','CNPJ/CPF','Qtd. Parcelas','Valor Total em Aberto','Venc. Mais Antigo','Venc. Mais Recente']);
    s.addRow(['1','Empresa Á','00.123.456/0001-99',50,9999,46023,46023]);
  }));
  assert.equal(r.aba, 'Detalhe'); assert.equal(r.empresas[0].valorEmAberto, '100.00'); assert.equal(r.empresas[0].cnpj, '00.123.456/0001-99');
});
test('resumo aceita fórmula com resultado e ignora rodapé do modelo', async () => {
  const r = await lerPlanilhaDebitos(await xlsx([['1','Empresa Á','00123456000199',2,{ formula:'SUM(10,20)', result:30 },46023,46024], ['TOTAL','1 empresa',null,2,30]], true));
  assert.equal(r.empresas[0].valorEmAberto, '30.00'); assert.equal(r.empresas[0].quantidadeParcelas, 2);
});
test('rejeita fórmulas sem resultado, datas impossíveis, valores vazios e linhas duplicadas', async () => {
  for (const rows of [[parcela({formula:'SUM(1,2)'})], [parcela(1,'31/02/2026')], [parcela(null)], [parcela(), parcela()]]) {
    await assert.rejects(lerPlanilhaDebitos(await xlsx(rows)), /linha 2|linha 3/);
  }
});
test('rejeita pagamentos e baixas em detalhes para não superestimar saldo', async () => {
  for (const extra of [[1], [0,'01/10/2026'], [0,null,'Quitado']]) await assert.rejects(lerPlanilhaDebitos(await xlsx([parcela(100,'01/01/2026',extra)])), /pagamento\/baixa/);
});
test('rejeita planilha vazia, abas ambíguas e identidades conflitantes dentro da planilha', async () => {
  await assert.rejects(lerPlanilhaDebitos(await xlsx([])), /vazia/);
  await assert.rejects(lerPlanilhaDebitos(await xlsx([parcela()], false, (w,s) => { const s2=w.addWorksheet('Outro'); s2.addRow(s.getRow(1).values.slice(1)); })), /única aba/);
  await assert.rejects(lerPlanilhaDebitos(await xlsx([parcela(), ['1','Outra','00123456000199','02/01/2026',10]])), /identidades diferentes/);
});
test('normaliza código, documento e nome sem aproximação perigosa', () => {
  const r = core.conciliarDebitos([empresa({ codigo:'001',cnpj:'00.123.456/0001-99' })], [lead()]); assert.equal(r.atualizacoes.length,1);
  const nome = core.conciliarDebitos([empresa({ codigo:'',cnpj:'',nome:' empresa a ' })],[lead()]); assert.equal(nome.atualizacoes.length,1);
  assert.equal(core.conciliarDebitos([empresa({codigo:'',cnpj:'',nome:'Empresa'})],[lead()]).atualizacoes.length,0);
});
test('conflitos de código/CNPJ e cadastros duplicados nunca atualizam nem viram ausentes', () => {
  const leads = [lead(),lead({id:'b',codigo:'2',cnpj:'99123456000199',nome:'Outra'})];
  const r=core.conciliarDebitos([empresa({cnpj:'99123456000199'})],leads);
  assert.equal(r.atualizacoes.length,0); assert.equal(r.pendencias.length,1); assert.equal(r.ausentes.length,0);
  const duplicado=core.conciliarDebitos([empresa()],[lead(),lead({id:'b'})]); assert.equal(duplicado.atualizacoes.length,0);assert.equal(duplicado.ausentes.length,0);
});
test('identificador forte divergente bloqueia correspondência apenas por nome', () => {
  const r=core.conciliarDebitos([empresa({codigo:'2',cnpj:'99123456000199'})],[lead()]);assert.equal(r.atualizacoes.length,0);assert.equal(r.ausentes.length,0);
});
test('lista apenas ausentes reais e impede duas empresas atualizando o mesmo cadastro', () => {
  const r=core.conciliarDebitos([empresa()],[lead(),lead({id:'b',nome:'Ausente',codigo:'9',cnpj:'99123456000199'})]);assert.deepEqual(r.ausentes.map(l=>l.id),['b']);
  const repetido=core.conciliarDebitos([empresa(),empresa({codigo:''})],[lead()]);assert.equal(repetido.atualizacoes.length,0);assert.equal(repetido.pendencias.length,2);
});

function servidorFixture() {
  let state={leads:[lead()],importacao:null};
  const fakePrisma={ $transaction:async fn=>{
    const draft=structuredClone(state);
    const tx={
      importacaoDebitosCrm:{findFirst:async({where})=>draft.importacao?.id===where.id&&draft.importacao.usuarioId===where.usuarioId?draft.importacao:null,
        update:async({data})=>(draft.importacao={...draft.importacao,...data})},
      leadCrm:{findMany:async()=>draft.leads.map(dbLead),
        updateMany:async({where,data})=>{const l=draft.leads.find(l=>l.id===where.id);if(!l || (where.atualizadoEm && l.atualizadoEm!==where.atualizadoEm.toISOString()))return {count:0};Object.assign(l,data,{atualizadoEm:new Date(Date.parse(l.atualizadoEm)+1000).toISOString()});return {count:1};},
        findUniqueOrThrow:async({where})=>({atualizadoEm:new Date(draft.leads.find(l=>l.id===where.id).atualizadoEm)})}
    };
    const result=await fn(tx);state=draft;return result;
  }};
  const service=load('lib/crmDebitosServidor.ts',{'node:crypto':crypto,'@prisma/client':{Prisma:{TransactionIsolationLevel:{Serializable:'Serializable'}}},'./prisma':{prisma:fakePrisma},'./crmDebitos':core});
  state.importacao={id:'import',usuarioId:'u',arquivo:'test.xlsx',criadoEm:new Date(),aplicadoEm:null,desfeitoEm:null,fingerprint:service.fingerprintLeads(state.leads),
    relatorio:{estagios:['em_negociacao'],...structuredClone(core.conciliarDebitos([empresa({valorEmAberto:'200.00'})],state.leads))}};
  return {service,get:()=>state,set:fn=>fn(state)};
}
function dbLead(l) {return {...l,atualizadoEm:new Date(l.atualizadoEm),valorEmAberto:l.valorEmAberto===null?null:{toFixed:()=>l.valorEmAberto},parcelaMaisAntiga:l.parcelaMaisAntiga?new Date(l.parcelaMaisAntiga):null,parcelaMaisRecente:l.parcelaMaisRecente?new Date(l.parcelaMaisRecente):null};}
test('aplica, reenvia de forma idempotente e desfaz sem mudar estágio',async()=>{
  const f=servidorFixture();await f.service.executarImportacao('import','u','aplicar');assert.equal(f.get().leads[0].valorEmAberto,'200.00');assert.equal(f.get().leads[0].estagio,'em_negociacao');
  await f.service.executarImportacao('import','u','aplicar');await f.service.executarImportacao('import','u','desfazer');assert.equal(f.get().leads[0].valorEmAberto,'100.00');assert.ok(f.get().importacao.desfeitoEm);
});
test('impede acesso entre usuários e prévia desatualizada',async()=>{
  const f=servidorFixture();await assert.rejects(f.service.executarImportacao('import','outro','aplicar'),/não encontrada/);
  f.set(s=>s.leads[0].nome='Alterado');await assert.rejects(f.service.executarImportacao('import','u','aplicar'),/funil mudou/);assert.equal(f.get().leads[0].valorEmAberto,'100.00');
});
test('reversão não sobrescreve edição posterior',async()=>{
  const f=servidorFixture();await f.service.executarImportacao('import','u','aplicar');f.set(s=>s.leads[0].atualizadoEm='2030-01-01T00:00:00.000Z');
  await assert.rejects(f.service.executarImportacao('import','u','desfazer'),/alterado ou removido/);assert.equal(f.get().leads[0].valorEmAberto,'200.00');assert.equal(f.get().importacao.desfeitoEm,null);
});
test('erro no segundo cadastro reverte a transação inteira',async()=>{
  const f=servidorFixture();f.set(s=>s.importacao.relatorio.atualizacoes.push({...s.importacao.relatorio.atualizacoes[0],lead:lead({id:'inexistente'})}));
  await assert.rejects(f.service.executarImportacao('import','u','aplicar'),/alterado ou removido/);assert.equal(f.get().leads[0].valorEmAberto,'100.00');assert.equal(f.get().importacao.aplicadoEm,null);
});
