import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(fs.readFileSync(new URL('../app/api/crm/historico/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function fixture(usuario = 'u1') {
  let chamadas = 0;
  const registros = Array.from({length: 53}, (_, i) => ({id: String(i), usuarioId:'u1', criadoEm:new Date(2026,0,1,0,0,53-i), lead:{ id:`empresa-${i%3}`, usuarioId:'u1', nome:`Empresa ${i%3}` }}));
  registros.push({ ...registros[0], id:'outro', usuarioId:'u2', lead:{...registros[0].lead,usuarioId:'u2'} });
  const dependencies = {
    'next/server': {NextResponse:{json:(data,init)=>Response.json(data,init)}},
    '../../../../lib/auth':{obterSessao:async()=>usuario ? {id:usuario,nome:'Usuário'}:null},
    '../../../../lib/prisma':{prisma:{historicoCrm:{findMany:async({where,orderBy,skip,take,select})=>{
      chamadas++;
      assert.deepEqual(orderBy,[{criadoEm:'desc'},{id:'desc'}]);
      assert.deepEqual(select.lead,{select:{id:true,nome:true,cnpj:true}});
      assert.equal(where.lead.usuarioId,usuario);
      return registros.filter(r=>r.usuarioId===where.usuarioId && r.lead.usuarioId===where.lead.usuarioId).slice(skip,skip+take);
    }}}},
  };
  const mod={exports:{}};
  new Function('require','module','exports',output)(id=>dependencies[id],mod,mod.exports);
  return {get: pagina=>mod.exports.GET({nextUrl:new URL(`http://localhost/api/crm/historico?pagina=${pagina}`)}), chamadas:()=>chamadas};
}
test('histórico geral reúne empresas e pagina todos os eventos sem misturar usuários', async()=>{
  const f=fixture(); const a=await (await f.get(0)).json();const b=await (await f.get(1)).json();
  assert.equal(a.itens.length,50);assert.equal(a.temMais,true);
  assert.equal(new Set(a.itens.map(i=>i.lead.id)).size,3);
  assert.equal(b.itens.length,3);assert.equal(b.temMais,false);
  assert.equal(new Set([...a.itens,...b.itens].map(i=>i.id)).size,53);
  assert.ok(a.itens.every(i=>i.usuarioId==='u1' && i.responsavel==='Usuário'));
});
test('sessão e página inválida são rejeitadas antes de consultar o banco', async()=>{
  const anonimo=fixture(null);assert.equal((await anonimo.get(0)).status,401);assert.equal(anonimo.chamadas(),0);
  const f=fixture();for(const pagina of ['-1','0.5','NaN','999999999999999']) assert.equal((await f.get(pagina)).status,400);
  assert.equal(f.chamadas(),0);
});
test('usuário sem movimentações recebe lista vazia',async()=>{
  const f=fixture('sem-registros');assert.deepEqual(await (await f.get(0)).json(),{itens:[],temMais:false});
});
