import ExcelJS from 'exceljs';
import { negociacoesDoMes, type NegociacaoPeriodo } from './negociacoesPeriodo';
import { hojeBrasil, saldoNegociacao, statusNegociacao, statusParcela, type Negociacao } from './negociacoes';

const MOEDA = '"R$" #,##0.00';
const CORES = { pago: 'FF70A64F', aguardando: 'FF4C78D0', atrasado: 'FF990F08', em_aberto: 'FFFFFFFF' };
const ROTULOS = { pago: 'PAGO', aguardando: 'AGUARD. PGT', atrasado: 'ATRASADA', em_aberto: 'EM ABERTO' };
export type OpcoesRelatorioNegociacoes = { hoje?: string; mes?: string; filtros?: string; acordosCompletos?: Negociacao[] };
const dataExcel = (data: string) => data ? new Date(`${data}T00:00:00.000Z`) : null;
const modalidade = (n: Negociacao) => n.tipo === 'avista' ? 'À VISTA' : 'PARCELADA';
const situacaoAcordo = (n: Negociacao, hoje: string) => {
  const estado = statusNegociacao(n, hoje);
  return estado === 'pago' ? 'PAGO' : estado === 'atrasado' ? 'EM ATRASO' : n.parcelas.some(p => p.pagoCentavos < p.valorCentavos && !p.vencimento) ? 'SEM VENCIMENTO DEFINIDO' : 'EM DIA';
};
const cnpjExcel = (cnpj: string) => cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

function cabecalho(planilha: ExcelJS.Worksheet, titulos: string[], larguras: number[], linha = 1) {
  planilha.columns = larguras.map(width => ({ width }));
  const header = planilha.getRow(linha);
  header.values = titulos; header.height = 34;
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF386650' } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  planilha.views = [{ state: 'frozen', ySplit: linha, xSplit: 3 }];
  planilha.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${linha}:${linha}` };
}

function formatarLinha(linha: ExcelJS.Row, estado?: keyof typeof CORES) {
  linha.height = 22;
  linha.eachCell({ includeEmpty: true }, cell => {
    cell.font = { name: 'Calibri', size: 11, color: { argb: estado === 'aguardando' || estado === 'atrasado' ? 'FFFFFFFF' : 'FF000000' } };
    cell.alignment = { vertical: 'middle' };
    if (estado) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES[estado] } };
    const border: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF222222' } };
    cell.border = { top: border, bottom: border, left: border, right: border };
  });
}

function situacao(data: string, referencia: string) {
  if (data.slice(0, 7) < referencia) return 'NEGOC. ANTERIOR';
  if (data.startsWith(referencia)) return 'NEGOC. DENTRO DO MÊS';
  return `NEGOC. mês ${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

export function criarRelatorioNegociacoes(negociacoes: Negociacao[], opcoes: OpcoesRelatorioNegociacoes = {}) {
  const hoje = opcoes.hoje ?? hojeBrasil();
  const referencia = opcoes.mes || hoje.slice(0, 7);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MeuMoney CRM';
  const planilha = workbook.addWorksheet('Negociações');
  cabecalho(planilha, ['ORDEM', 'SITUAÇÃO', 'EMPRESA', 'CNPJ', 'PARCELAS EM ATRASO', 'DATA NEGOCIAÇÃO', 'DÉBITO', 'Negociação', 'STATUS', 'DATA PGTO', 'VALOR PAGO', 'VALOR A RECEBER', 'OBS', 'MODALIDADE', 'VENCIMENTO', 'SITUAÇÃO DO ACORDO', 'ID DO ACORDO'], [9, 27, 48, 22, 15, 18, 18, 13, 19, 16, 18, 20, 60, 16, 18, 28, 30]);
  const ordenadas = (opcoes.mes ? negociacoesDoMes(negociacoes, referencia) : [...negociacoes] as NegociacaoPeriodo[]).sort((a, b) => a.dataNegociacao.localeCompare(b.dataNegociacao) || a.empresa.localeCompare(b.empresa, 'pt-BR') || a.id.localeCompare(b.id));
  const completos = opcoes.acordosCompletos ?? negociacoes;
  const porId = new Map(completos.map(n => [n.id, n]));
  let ordem = 0;
  for (const negociacao of ordenadas) {
    for (const parcela of negociacao.parcelas) {
      const estado = statusParcela(parcela, hoje);
      const linha = planilha.addRow([
        ++ordem, situacao(negociacao.dataNegociacao, referencia), negociacao.empresa, cnpjExcel(negociacao.cnpj),
        negociacao.parcelasOriginais, dataExcel(negociacao.dataNegociacao), negociacao.debitoCentavos / 100,
        `${parcela.numero}/${negociacao.totalParcelasAcordo ?? negociacao.parcelas.length}`, ROTULOS[estado], dataExcel(parcela.dataPagamento), parcela.pagoCentavos / 100, Math.max(0, parcela.valorCentavos - parcela.pagoCentavos) / 100, negociacao.observacoes, modalidade(negociacao), dataExcel(parcela.vencimento), situacaoAcordo(porId.get(negociacao.id) ?? negociacao, hoje), negociacao.id,
      ]);
      formatarLinha(linha, estado);
      for (const coluna of [1, 5, 6, 8, 9, 10]) linha.getCell(coluna).alignment = { horizontal: 'center', vertical: 'middle' };
      for (const coluna of [4, 8]) linha.getCell(coluna).numFmt = '@';
      for (const coluna of [6, 10, 15]) linha.getCell(coluna).numFmt = 'dd/mm/yyyy';
      for (const coluna of [7, 11, 12]) linha.getCell(coluna).numFmt = MOEDA;
      linha.getCell(13).alignment = { vertical: 'middle', wrapText: true };
      if (negociacao.observacoes) linha.height = 34;
    }
  }
  planilha.autoFilter = { from: 'A1', to: `Q${Math.max(1, planilha.rowCount)}` };
  adicionarAcordos(workbook, completos, hoje, opcoes.mes);
  adicionarResumo(workbook, ordenadas, hoje, opcoes.mes ? referencia : '', opcoes.filtros);
  return workbook;
}

function adicionarAcordos(workbook: ExcelJS.Workbook, negociacoes: Negociacao[], hoje: string, mes?: string) {
  const sheet = workbook.addWorksheet(mes ? 'Negociadas no mês' : 'Acordos completos');
  cabecalho(sheet, ['ID DO ACORDO', 'EMPRESA', 'CNPJ', 'MODALIDADE', 'DATA NEGOCIAÇÃO', 'SITUAÇÃO NO MÊS', 'SITUAÇÃO DO ACORDO', 'TOTAL DE PARCELAS', 'VALOR NEGOCIADO', 'VALOR PAGO ACUMULADO', 'SALDO DO ACORDO', 'PARCELAS EM ATRASO'], [30, 48, 22, 16, 20, 28, 28, 20, 22, 25, 22, 30]);
  const ordenadas = negociacoes.filter(n => !mes || n.dataNegociacao.startsWith(`${mes}-`))
    .sort((a, b) => a.dataNegociacao.localeCompare(b.dataNegociacao) || a.empresa.localeCompare(b.empresa, 'pt-BR') || a.id.localeCompare(b.id));
  for (const n of ordenadas) {
    const linha = sheet.addRow([n.id, n.empresa, cnpjExcel(n.cnpj), modalidade(n), dataExcel(n.dataNegociacao), mes ? situacao(n.dataNegociacao, mes) : 'TODO O HISTÓRICO', situacaoAcordo(n, hoje), n.parcelas.length, n.totalCentavos / 100, n.parcelas.reduce((s, p) => s + p.pagoCentavos, 0) / 100, saldoNegociacao(n) / 100, n.parcelas.filter(p => statusParcela(p, hoje) === 'atrasado').map(p => `${p.numero}/${n.parcelas.length}`).join(', ')]);
    formatarLinha(linha, statusNegociacao(n, hoje));
    linha.getCell(5).numFmt = 'dd/mm/yyyy';
    for (const c of [1, 3, 12]) linha.getCell(c).numFmt = '@';
    for (const c of [9, 10, 11]) linha.getCell(c).numFmt = MOEDA;
  }
  sheet.autoFilter = { from: 'A1', to: `L${Math.max(1, sheet.rowCount)}` };
}

function adicionarResumo(workbook: ExcelJS.Workbook, negociacoes: Negociacao[], hoje: string, referencia: string, filtros?: string) {
  const resumo = workbook.addWorksheet('Resumo dos acordos');
  resumo.addRow(['RELATÓRIO DE NEGOCIAÇÕES']);
  resumo.addRow([`Emitido em ${hoje.split('-').reverse().join('/')} · ${referencia ? `Mês dos recebíveis: ${referencia.split('-').reverse().join('/')}` : 'Todo o histórico'}`]);
  resumo.addRow([`Filtros: ${filtros || 'Todas as negociações'}`]);
  for (let i = 1; i <= 3; i++) resumo.mergeCells(i, 1, i, 10);
  cabecalho(resumo, ['EMPRESA', 'CNPJ', 'DATA NEGOCIAÇÃO', 'PARCELAS ORIGINAIS', 'DÉBITO ORIGINAL', 'VALOR NO PERÍODO', 'PAGO DAS PARCELAS', 'SALDO NO PERÍODO', 'PARCELAS PAGAS NO PERÍODO', 'VENCIMENTO NO PERÍODO'], [48, 22, 19, 19, 20, 20, 20, 20, 19, 23], 5);
  const totais = { debito: 0, negociado: 0, pago: 0, saldo: 0 };
  for (const n of negociacoes) {
    const pago = n.parcelas.reduce((total, p) => total + p.pagoCentavos, 0);
    const vencimento = n.parcelas.filter(p => p.pagoCentavos < p.valorCentavos && p.vencimento).map(p => p.vencimento).sort()[0];
    const linha = resumo.addRow([n.empresa, cnpjExcel(n.cnpj), dataExcel(n.dataNegociacao), n.parcelasOriginais, n.debitoCentavos / 100, n.totalCentavos / 100, pago / 100, saldoNegociacao(n) / 100, `${n.parcelas.filter(p => p.pagoCentavos >= p.valorCentavos).length}/${n.parcelas.length}`, dataExcel(vencimento || '')]);
    formatarLinha(linha);
    for (const coluna of [2, 9]) linha.getCell(coluna).numFmt = '@';
    for (const coluna of [3, 10]) linha.getCell(coluna).numFmt = 'dd/mm/yyyy';
    for (const coluna of [5, 6, 7, 8]) linha.getCell(coluna).numFmt = MOEDA;
    totais.debito += n.debitoCentavos; totais.negociado += n.totalCentavos; totais.pago += pago; totais.saldo += saldoNegociacao(n);
  }
  resumo.autoFilter = { from: 'A5', to: `J${Math.max(5, resumo.rowCount)}` };
  const total = resumo.addRow(['TOTAL', '', '', '', totais.debito / 100, totais.negociado / 100, totais.pago / 100, totais.saldo / 100]);
  total.font = { bold: true };
  for (const coluna of [5, 6, 7, 8]) total.getCell(coluna).numFmt = MOEDA;
  resumo.addRow([]);
  resumo.addRow(['Aba Negociações: uma linha por parcela do período selecionado. Débito e parcelas originais se repetem; use os totais desta aba para evitar duplicidade.']);
  resumo.addRow(['Negociação = parcela/total. Valor a receber = saldo da parcela após os pagamentos, nunca negativo. Valor pago = valor efetivamente recebido da parcela; Data PGTO = data do pagamento da parcela. Com valor pago, a parcela entra no mês do pagamento; sem pagamento, no mês do vencimento.']);
  resumo.addRow(['Na aba Negociações, a coluna original Parcelas em atraso informa as parcelas originais do débito. Situação do acordo considera todas as parcelas; sem vencimento definido não é classificado como em dia. Situação compara a data do acordo ao mês de referência.']);
  resumo.addRow(['Cores: verde = pago; azul = aguardando pagamento; vermelho = atrasada; branco = em aberto. Status calculados na data de emissão. Valores e saldo limitados às parcelas do período.']);
  for (let i = resumo.rowCount - 3; i <= resumo.rowCount; i++) { resumo.mergeCells(i, 1, i, 10); resumo.getRow(i).height = 30; resumo.getCell(i, 1).alignment = { wrapText: true }; }
}

export async function baixarRelatorioNegociacoes(negociacoes: Negociacao[], opcoes: OpcoesRelatorioNegociacoes = {}) {
  const workbook = criarRelatorioNegociacoes(negociacoes, opcoes);
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(new Uint8Array(buffer));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url; link.download = `negociacoes-${opcoes.mes || opcoes.hoje || hojeBrasil()}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
