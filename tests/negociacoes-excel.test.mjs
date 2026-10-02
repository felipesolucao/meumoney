import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import ExcelJS from 'exceljs';
function load(file, dependencies = {}) {
  const output = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => { if (!(id in dependencies)) throw new Error(id); return dependencies[id]; }, mod, mod.exports);
  return mod.exports;
}
const lib = load('lib/negociacoes.ts');
const { criarRelatorioNegociacoes } = load('lib/negociacoesExcel.ts', { exceljs: ExcelJS, './negociacoes': lib });
const acordo = () => ({ id: 'n1', versao: 1, empresa: 'Empresa Á & Cia', cnpj: '00123456000199', tipo: 'parcelada', dataNegociacao: '2026-09-20', debitoCentavos: 15000, totalCentavos: 10000, parcelasOriginais: 2, observacoes: 'Acréscimo combinado', parcelas: [
  { numero: 1, valorCentavos: 2500, pagoCentavos: 2500, dataPagamento: '2026-09-22', vencimento: '2026-09-25', situacao: 'aguardando' },
  { numero: 2, valorCentavos: 2500, pagoCentavos: 500, dataPagamento: '2026-09-30', vencimento: '2026-10-01', situacao: 'aguardando' },
  { numero: 3, valorCentavos: 2500, pagoCentavos: 0, dataPagamento: '', vencimento: '2026-10-02', situacao: 'aguardando' },
  { numero: 4, valorCentavos: 2500, pagoCentavos: 0, dataPagamento: '', vencimento: '', situacao: 'em_aberto' },
] });
test('Excel reproduz 12 colunas, cores por parcela, datas, CNPJ e pagamentos reais', async () => {
  const workbook = criarRelatorioNegociacoes([acordo()], { hoje: '2026-10-02', mes: '2026-09', filtros: 'Tipo: Parcelada' });
  const loaded = new ExcelJS.Workbook(); await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet = loaded.getWorksheet('Negociações');
  assert.deepEqual(sheet.getRow(1).values.slice(1), ['ORDEM', 'SITUAÇÃO', 'EMPRESA', 'CNPJ', 'PARCELAS EM ATRASO', 'DATA NEGOCIAÇÃO', 'DÉBITO', 'Negociação', 'STATUS', 'DATA PGTO', 'VALOR PAGO', 'OBS']);
  assert.equal(sheet.rowCount, 5);
  assert.equal(sheet.getCell('D2').value, '00.123.456/0001-99');
  assert.equal(sheet.getCell('H2').value, '1/4'); assert.equal(sheet.getCell('H5').value, '4/4');
  assert.equal(sheet.getCell('F2').value.toISOString(), '2026-09-20T00:00:00.000Z');
  assert.equal(sheet.getCell('J2').value.toISOString(), '2026-09-22T00:00:00.000Z');
  assert.equal(sheet.getCell('J4').value, null);
  assert.deepEqual([2,3,4,5].map(r => sheet.getCell(`I${r}`).value), ['PAGO','ATRASADA','AGUARD. PGT','EM ABERTO']);
  assert.deepEqual([2,3,4,5].map(r => sheet.getCell(`A${r}`).fill.fgColor.argb), ['FF70A64F','FF990F08','FF4C78D0','FFFFFFFF']);
  assert.deepEqual([2,3,4,5].map(r => sheet.getCell(`K${r}`).value), [25,5,0,0]);
  assert.equal(sheet.getCell('G2').value, 150); assert.equal(sheet.getCell('G2').numFmt, '"R$" #,##0.00');
  assert.equal(sheet.getCell('B2').value, 'NEGOC. DENTRO DO MÊS');
  assert.equal(sheet.autoFilter, 'A1:L5'); assert.equal(sheet.views[0].ySplit, 1);
});
test('resumo soma cada acordo uma única vez e não duplica débito por parcela', () => {
  const workbook = criarRelatorioNegociacoes([acordo()], { hoje: '2026-10-02', filtros: 'Empresa/CNPJ: Empresa' });
  const resumo = workbook.getWorksheet('Resumo dos acordos');
  assert.equal(resumo.getCell('A3').value, 'Filtros: Empresa/CNPJ: Empresa');
  assert.equal(resumo.getCell('E7').value, 150); assert.equal(resumo.getCell('F7').value, 100); assert.equal(resumo.getCell('G7').value, 30); assert.equal(resumo.getCell('H7').value, 70);
  assert.equal(resumo.getCell('J6').value.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(workbook.getWorksheet('Negociações').getCell('B2').value, 'NEGOC. ANTERIOR');
});
test('exporta apenas acordos recebidos e preserva textos como texto, sem fórmulas', async () => {
  const n = { ...acordo(), empresa: '=HYPERLINK("https://example.com")', observacoes: '+SUM(A1:A2)' };
  const original = JSON.stringify(n);
  const workbook = criarRelatorioNegociacoes([n], { hoje: '2026-10-02' });
  const loaded = new ExcelJS.Workbook(); await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet = loaded.getWorksheet('Negociações');
  assert.equal(sheet.rowCount, 5); assert.equal(sheet.getCell('C2').value, n.empresa); assert.equal(sheet.getCell('C2').type, ExcelJS.ValueType.String); assert.equal(sheet.getCell('L2').value, n.observacoes);
  assert.equal(JSON.stringify(n), original);
});
test('lista vazia gera cabeçalhos válidos e totais zerados', async () => {
  const workbook = criarRelatorioNegociacoes([], { hoje: '2026-10-02' });
  assert.equal(workbook.getWorksheet('Negociações').rowCount, 1);
  assert.equal(workbook.getWorksheet('Resumo dos acordos').getCell('F6').value, 0);
  assert.ok((await workbook.xlsx.writeBuffer()).byteLength > 0);
});
