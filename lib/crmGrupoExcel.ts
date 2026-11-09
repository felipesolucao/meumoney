import ExcelJS from 'exceljs';
import type { LeadCrmResumo } from './crm';

const numero = (v: string | number | null) => v === null || v === '' ? null : Number(v);
const data = (v: string | null) => v ? new Date(v) : null;

export function criarRelatorioGrupo(leads: LeadCrmResumo[], grupo: { id: string; label: string }) {
  const empresas = leads.filter(l => l.estagio === grupo.id).sort((a, b) => a.ordem - b.ordem);
  const extras = [...new Set(empresas.flatMap(l => Object.keys(l.camposExtras ?? {})))].sort();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MeuMoney CRM';
  const sheet = workbook.addWorksheet('Empresas do grupo');
  const titulos = ['Nome', 'CNPJ', 'Cód.', 'Telefone', 'Observação', 'Qtd. de parcelas', 'Valor total com juros', 'Valor em aberto', 'Valor pago', 'Grupo', 'Telefone secundário', 'E-mail', 'Qtd. de colaboradores', 'Sindicato patronal', 'Origem', 'Parcela mais antiga', 'Parcela mais recente', 'Último contato', 'Status da planilha', 'Progresso (%)', 'Última movimentação', 'Criado em', 'Atualizado em', ...extras.map(k => 'Extra: ' + k)];
  sheet.columns = titulos.map((header, i) => ({ header, width: i === 0 || i === 4 ? 45 : 24 }));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getRow(1).height = 32;
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF386650' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  for (const l of empresas) {
    const row = sheet.addRow([
      l.nome, l.cnpj, l.codigo, l.telefone, l.observacoes, l.quantidadeParcelas,
      numero(l.valorTotalComJuros), numero(l.valorEmAberto), numero(l.valorPago), grupo.label,
      l.telefone2, l.email, l.quantidadeColaboradores, l.sindicatoPatronal, l.origem,
      data(l.parcelaMaisAntiga), data(l.parcelaMaisRecente), data(l.dataUltimoContato), l.statusPlanilha,
      l.progresso, data(l.movimentadoEm), data(l.criadoEm), data(l.atualizadoEm),
      ...extras.map(k => {
        const v = l.camposExtras?.[k];
        return v == null ? null : typeof v === 'object' ? JSON.stringify(v) : String(v);
      }),
    ]);
    row.alignment = { vertical: 'top', wrapText: true };
    for (const c of [2, 3, 4, 11]) row.getCell(c).numFmt = '@';
    for (const c of [7, 8, 9]) row.getCell(c).numFmt = '"R$" #,##0.00';
    for (const c of [16, 17, 18, 21, 22, 23]) row.getCell(c).numFmt = 'dd/mm/yyyy';
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: titulos.length } };
  return workbook;
}

export async function baixarRelatorioGrupo(leads: LeadCrmResumo[], grupo: { id: string; label: string }) {
  const buffer = await criarRelatorioGrupo(leads, grupo).xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(new Uint8Array(buffer));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  const nome = grupo.label.replace(/[^\p{L}\p{N} _.-]/gu, '-').slice(0, 100) || 'grupo';
  link.href = url;
  link.download = 'crm-' + nome + '.xlsx';
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
