import { saldoNegociacao, chaveEmpresa, hojeBrasil, statusParcela, type Negociacao } from './negociacoes';

export function percentualNegociado(valor: number, negociado: number) {
  return (negociado > 0 ? valor / negociado : 0).toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function resumoNegociacoesDiarias(lista: Negociacao[], mes: string, hoje = hojeBrasil()) {
  const dias = new Map<string, { empresas: Set<string>; negociado: number; pago: number; aReceber: number; emAtraso: number }>();
  const empresas = new Set<string>();
  let negociado = 0;
  let pago = 0;
  let aReceber = 0;
  let emAtraso = 0;
  for (const n of lista) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) || !n.dataNegociacao.startsWith(`${mes}-`)) continue;
    const empresa = chaveEmpresa(n);
    const recebido = n.parcelas.reduce((s, p) => s + p.pagoCentavos, 0);
    const vencido = n.parcelas.reduce((s, p) => s + (statusParcela(p, hoje) === 'atrasado' ? Math.max(0, p.valorCentavos - p.pagoCentavos) : 0), 0);
    const dia = dias.get(n.dataNegociacao) ?? { empresas: new Set<string>(), negociado: 0, pago: 0, aReceber: 0, emAtraso: 0 };
    dia.empresas.add(empresa);
    dia.negociado += n.totalCentavos;
    dia.pago += recebido;
    dia.aReceber += saldoNegociacao(n);
    dia.emAtraso += vencido;
    emAtraso += vencido;
    aReceber += saldoNegociacao(n);
    dias.set(n.dataNegociacao, dia);
    empresas.add(empresa);
    negociado += n.totalCentavos;
    pago += recebido;
  }
  return {
    empresas: empresas.size, negociado, pago, aReceber, emAtraso,
    dias: [...dias].sort(([a], [b]) => a.localeCompare(b)).map(([data, dia]) => ({
      data, empresas: dia.empresas.size, negociado: dia.negociado, pago: dia.pago,
      aReceber: dia.aReceber, emAtraso: dia.emAtraso,
    })),
  };
}
