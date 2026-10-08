export type ParcelaNegociacao = { numero: number; valorCentavos: number; vencimento: string; pagoCentavos: number; dataPagamento: string; situacao: 'em_aberto' | 'aguardando' };
export type DadosNegociacao = { leadId?: string | null; empresa: string; cnpj: string; tipo: 'avista' | 'parcelada'; dataNegociacao: string; debitoCentavos: number; totalCentavos: number; parcelasOriginais: number; observacoes: string; parcelas: ParcelaNegociacao[] };
export type Negociacao = DadosNegociacao & { id: string; versao: number; contratoId?: string; codigoContrato?: string; clienteId?: string; lead?: { id: string; nome: string; estagio: string } | null };
export const STATUS = { em_aberto: 'Em aberto', aguardando: 'Aguardando pagamento', atrasado: 'Em atraso', pago: 'Pago' };
export function hojeBrasil() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function moeda(c: number) { return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
export function centavos(v: string) { return Math.round(Number(v) * 100); }
export function statusParcela(p: ParcelaNegociacao, hoje = hojeBrasil()): keyof typeof STATUS {
  if (p.pagoCentavos >= p.valorCentavos) return 'pago';
  if (p.vencimento && p.vencimento < hoje) return 'atrasado';
  return p.situacao;
}
export function statusNegociacao(n: DadosNegociacao, hoje = hojeBrasil()): keyof typeof STATUS {
  const estados = n.parcelas.map(p => statusParcela(p, hoje));
  if (estados.every(s => s === 'pago')) return 'pago';
  if (estados.includes('atrasado')) return 'atrasado';
  return estados.includes('aguardando') ? 'aguardando' : 'em_aberto';
}
export function resumoNegociacoes(lista: DadosNegociacao[]) {
  return { negociado: lista.reduce((s, n) => s + n.totalCentavos, 0), pago: lista.reduce((s, n) => s + n.parcelas.reduce((v, p) => v + p.pagoCentavos, 0), 0), empresas: new Set(lista.map(chaveEmpresa)).size, recuperadas: lista.filter(n => statusNegociacao(n) === 'pago').reduce((s, n) => s + n.parcelasOriginais, 0) };
}
function dataValida(v: unknown): v is string { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v; }
function inteiro(v: unknown, min: number, max = 2000000000): v is number { return typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max; }
export function validarNegociacao(valor: unknown): DadosNegociacao {
  if (!valor || typeof valor !== 'object') throw new Error('Dados inválidos.');
  const n = valor as Record<string, unknown>;
  if (n.leadId != null && (typeof n.leadId !== 'string' || !n.leadId.trim() || n.leadId.length > 100)) throw new Error('Empresa do funil inválida.');
  if (typeof n.empresa !== 'string' || !n.empresa.trim() || n.empresa.length > 200) throw new Error('Informe a empresa (até 200 caracteres).');
  const cnpj = typeof n.cnpj === 'string' ? n.cnpj.replace(/\D/g, '') : '';
  if (cnpj.length !== 14) throw new Error('Informe o CNPJ com 14 dígitos.');
  if (n.tipo !== 'avista' && n.tipo !== 'parcelada') throw new Error('Tipo de negociação inválido.');
  if (!dataValida(n.dataNegociacao)) throw new Error('Data da negociação inválida.');
  if (!inteiro(n.debitoCentavos, 1) || !inteiro(n.totalCentavos, 1)) throw new Error('Informe valores positivos de até R$ 20 milhões.');
  if (!inteiro(n.parcelasOriginais, 1, 10000)) throw new Error('Informe quantas parcelas originais estavam em aberto.');
  if (!Array.isArray(n.parcelas) || n.parcelas.length < 1) throw new Error('Gere o cronograma de parcelas antes de salvar.');
  if (n.parcelas.length > 360) throw new Error('Quantidade de parcelas inválida (máximo 360).');
  if (n.tipo === 'avista' && n.parcelas.length !== 1) throw new Error('Negociação à vista deve ter exatamente uma parcela.');
  if (n.tipo === 'parcelada' && n.parcelas.length < 2) throw new Error('Negociação parcelada deve ter pelo menos duas parcelas. Para pagar em uma vez, selecione À vista.');
  const parcelas = n.parcelas.map((item: unknown, i): ParcelaNegociacao => {
    if (!item || typeof item !== 'object') throw new Error('Parcela inválida.');
    const p = item as Record<string, unknown>;
    if (!inteiro(p.valorCentavos, 1) || !inteiro(p.pagoCentavos, 0, p.valorCentavos)) throw new Error(`Valor ou pagamento inválido na parcela ${i + 1}.`);
    if (p.vencimento !== '' && !dataValida(p.vencimento)) throw new Error('Vencimento inválido.');
    if (p.situacao !== 'em_aberto' && p.situacao !== 'aguardando') throw new Error('Situação inválida.');
    if (p.situacao === 'aguardando' && !p.vencimento) throw new Error('Informe o vencimento para aguardar pagamento.');
    if (p.pagoCentavos > 0 && (!dataValida(p.dataPagamento) || p.dataPagamento > hojeBrasil())) throw new Error('Informe a data do pagamento, até hoje.');
    return { numero: i + 1, valorCentavos: p.valorCentavos, pagoCentavos: p.pagoCentavos, vencimento: p.vencimento as string, dataPagamento: p.pagoCentavos ? p.dataPagamento as string : '', situacao: p.situacao };
  });
  if (parcelas.reduce((s, p) => s + p.valorCentavos, 0) !== n.totalCentavos) throw new Error('A soma das parcelas deve ser igual ao total negociado.');
  if (typeof n.observacoes !== 'string' || n.observacoes.length > 5000) throw new Error('Observações devem ter até 5.000 caracteres.');
  return { ...(n.leadId !== undefined ? { leadId: n.leadId as string | null } : {}), empresa: n.empresa.trim(), cnpj, tipo: n.tipo, dataNegociacao: n.dataNegociacao, debitoCentavos: n.debitoCentavos, totalCentavos: n.totalCentavos, parcelasOriginais: n.parcelasOriginais, observacoes: n.observacoes, parcelas };
}
export function gerarParcelas(total: number, quantidade: number, primeiroVencimento: string): ParcelaNegociacao[] {
  if (!inteiro(total, 1) || !inteiro(quantidade, 1, 360) || total < quantidade || !dataValida(primeiroVencimento)) throw new Error('Informe total, quantidade e primeiro vencimento válidos.');
  const [ano, mes, dia] = primeiroVencimento.split('-').map(Number);
  return Array.from({ length: quantidade }, (_, i) => {
    const ultimoDia = new Date(Date.UTC(ano, mes + i, 0)).getUTCDate();
    return { numero: i + 1, valorCentavos: Math.floor(total / quantidade) + (i < total % quantidade ? 1 : 0), vencimento: new Date(Date.UTC(ano, mes - 1 + i, Math.min(dia, ultimoDia))).toISOString().slice(0, 10), pagoCentavos: 0, dataPagamento: '', situacao: 'aguardando' };
  });
}

export function prepararNegociacaoParaSalvar(dados: DadosNegociacao, quantidade: number, primeiroVencimento: string): DadosNegociacao {
  return validarNegociacao({
    ...dados,
    parcelas: dados.parcelas.length ? dados.parcelas : gerarParcelas(dados.totalCentavos, dados.tipo === 'avista' ? 1 : quantidade, primeiroVencimento),
  });
}

export function chaveEmpresa(n: DadosNegociacao & { clienteId?: string }) {
  return n.cnpj.replace(/\D/g, '') || n.leadId || n.clienteId || n.empresa;
}
