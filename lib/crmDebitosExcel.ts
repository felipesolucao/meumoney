import ExcelJS from 'exceljs';
import { normalizarCodigo, normalizarDocumento, normalizarNome, type EmpresaDebito } from './crmDebitos';

const aliases = {
  codigo: ['cod', 'codigo'], nome: ['razao social', 'nome', 'associado'], cnpj: ['cnpj/cpf', 'cnpj', 'cpf'],
  quantidade: ['qtd parcelas', 'quantidade de parcelas', 'quantidade parcelas'],
  total: ['valor total em aberto', 'valor em aberto', 'debito em aberto'],
  antiga: ['venc mais antigo', 'parcela mais antiga'], recente: ['venc mais recente', 'parcela mais recente'],
  vencimento: ['dt venc', 'vencimento', 'data de vencimento'], valor: ['vr doc', 'valor documento', 'valor da parcela'],
  pago: ['vr pag', 'valor pago'], dataPago: ['dt pag', 'data pagamento'], baixa: ['tipo baixa'],
};
type Campo = keyof typeof aliases;
function valorCelula(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('formula' in v || 'sharedFormula' in v) {
      if (v.result === undefined) throw new Error(`Fórmula sem resultado em ${cell.address}. Recalcule e salve no Excel ou use a aba de detalhes.`);
      return v.result;
    }
    if ('richText' in v) return v.richText.map(t => t.text).join('');
    if ('error' in v) throw new Error(`Erro de célula em ${cell.address}.`);
    if ('text' in v) return v.text;
  }
  return v;
}
function texto(v: unknown): string { return v == null ? '' : String(v).trim(); }
function centavos(v: unknown): number {
  const t = texto(v).replace(/^R\$\s*/, '').replace(/\s/g, '');
  const normalizado = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) throw new Error('Valor monetário vazio, negativo ou inválido.');
  const n = Math.round(Number(normalizado) * 100);
  if (!Number.isSafeInteger(n) || n > 999999999999) throw new Error('Valor monetário excede o limite.');
  return n;
}
function data(v: unknown, date1904: boolean): string {
  let d: Date;
  if (v instanceof Date) d = v;
  else if (typeof v === 'number') d = new Date(Date.UTC(1899, 11, 30) + (v + (date1904 ? 1462 : 0)) * 86400000);
  else {
    const t = texto(v);
    const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : '';
    d = new Date(iso + 'T00:00:00Z');
    if (!iso || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== iso) throw new Error('Vencimento inválido.');
  }
  if (!Number.isFinite(d.getTime()) || d.getUTCFullYear() < 1900 || d.getUTCFullYear() > 2200) throw new Error('Vencimento inválido.');
  return d.toISOString().slice(0, 10) + 'T00:00:00.000Z';
}
function colunas(sheet: ExcelJS.Worksheet) {
  const mapa = new Map<Campo, number>();
  sheet.getRow(1).eachCell((cell, i) => {
    const cabecalho = normalizarNome(cell.text).replace(/\./g, '');
    for (const campo of Object.keys(aliases) as Campo[]) {
      if (aliases[campo].includes(cabecalho)) {
        if (mapa.has(campo)) throw new Error(`Coluna repetida: ${cell.text}.`);
        mapa.set(campo, i);
      }
    }
  });
  return mapa;
}
export async function lerPlanilhaDebitos(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS tipa Buffer sem os genéricos recentes de @types/node.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const abas = workbook.worksheets.map(sheet => ({ sheet, mapa: colunas(sheet) }));
  const temIdentidade = (m: Map<Campo, number>) => m.has('nome') && (m.has('codigo') || m.has('cnpj'));
  const detalhes = abas.filter(a => temIdentidade(a.mapa) && a.mapa.has('vencimento') && a.mapa.has('valor'));
  const resumos = abas.filter(a => temIdentidade(a.mapa) && ['total', 'quantidade', 'antiga', 'recente'].every(c => a.mapa.has(c as Campo)));
  const candidatas = detalhes.length ? detalhes : resumos;
  if (candidatas.length !== 1) throw new Error('A planilha deve ter uma única aba de detalhes reconhecida, ou uma única aba de resumo. Use os cabeçalhos do modelo.');
  const { sheet, mapa } = candidatas[0];
  const detalhada = detalhes.length > 0;
  if (sheet.rowCount > 20001 || sheet.columnCount > 100) throw new Error('Limite: 20.000 linhas e 100 colunas.');
  const empresas = new Map<string, EmpresaDebito>();
  const assinaturas = new Set<string>();
  let linhas = 0;
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    try {
      const pega = (campo: Campo) => mapa.has(campo) ? valorCelula(row.getCell(mapa.get(campo) as number)) : null;
      const codigo = texto(pega('codigo')), nome = texto(pega('nome')), cnpj = texto(pega('cnpj'));
      if (!detalhada && !cnpj && (normalizarNome(codigo) === 'total' || (!nome && normalizarNome(codigo).startsWith('conferencia com o rodape do relatorio original:')))) return;
      if (!nome || (!codigo && !cnpj)) throw new Error('Informe razão social e código ou CNPJ/CPF em todas as linhas.');
      if (cnpj && !/^(\d{11}|[A-Z\d]{12}\d{2})$/.test(normalizarDocumento(cnpj))) throw new Error('CNPJ/CPF inválido. Preserve os zeros iniciais como texto.');
      const chave = codigo ? `cod:${normalizarCodigo(codigo)}` : `doc:${normalizarDocumento(cnpj)}`;
      const anterior = empresas.get(chave);
      if (anterior && (normalizarDocumento(anterior.cnpj) !== normalizarDocumento(cnpj) || normalizarNome(anterior.nome) !== normalizarNome(nome))) throw new Error('Código/documento repetido com identidades diferentes.');
      if (anterior && !detalhada) throw new Error('Empresa repetida na aba de resumo.');
      if (detalhada) {
        const assinatura = JSON.stringify(row.values);
        if (assinaturas.has(assinatura)) throw new Error('Parcela duplicada: linha idêntica já encontrada.');
        assinaturas.add(assinatura);
        if (texto(pega('dataPago')) || texto(pega('baixa')) || (texto(pega('pago')) && centavos(pega('pago')) > 0)) throw new Error('Parcela com pagamento/baixa. Exporte somente os débitos em aberto sem pagamentos ou use um resumo com o saldo correto.');
      }
      const valor = centavos(pega(detalhada ? 'valor' : 'total'));
      const quantidade = detalhada ? 1 : Number(pega('quantidade'));
      if (!Number.isSafeInteger(quantidade) || quantidade <= 0 || quantidade > 2147483647) throw new Error('Quantidade de parcelas inválida.');
      const antiga = data(pega(detalhada ? 'vencimento' : 'antiga'), Boolean(workbook.properties.date1904));
      const recente = data(pega(detalhada ? 'vencimento' : 'recente'), Boolean(workbook.properties.date1904));
      if (antiga > recente) throw new Error('Vencimento mais antigo posterior ao mais recente.');
      const soma = valor + (anterior ? centavos(anterior.valorEmAberto) : 0);
      if (soma > 999999999999) throw new Error('Total da empresa excede o limite.');
      empresas.set(chave, { codigo, nome, cnpj, valorEmAberto: (soma / 100).toFixed(2), quantidadeParcelas: (anterior?.quantidadeParcelas ?? 0) + quantidade,
        parcelaMaisAntiga: anterior?.parcelaMaisAntiga && anterior.parcelaMaisAntiga < antiga ? anterior.parcelaMaisAntiga : antiga,
        parcelaMaisRecente: anterior?.parcelaMaisRecente && anterior.parcelaMaisRecente > recente ? anterior.parcelaMaisRecente : recente });
      linhas++;
    } catch (e) { throw new Error(`${sheet.name}, linha ${n}: ${e instanceof Error ? e.message : 'Dados inválidos.'}`); }
  });
  if (!linhas) throw new Error('A planilha está vazia.');
  return { aba: sheet.name, linhas, empresas: [...empresas.values()] };
}
