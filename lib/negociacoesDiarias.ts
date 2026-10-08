import { chaveEmpresa, type Negociacao } from './negociacoes';

export function resumoNegociacoesDiarias(lista: Negociacao[], mes: string) {
  const dias = new Map<string, { empresas: Set<string>; negociado: number; pago: number }>();
  const empresas = new Set<string>();
  let negociado = 0;
  let pago = 0;
  for (const n of lista) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) || !n.dataNegociacao.startsWith(`${mes}-`)) continue;
    const empresa = chaveEmpresa(n);
    const recebido = n.parcelas.reduce((s, p) => s + p.pagoCentavos, 0);
    const dia = dias.get(n.dataNegociacao) ?? { empresas: new Set<string>(), negociado: 0, pago: 0 };
    dia.empresas.add(empresa);
    dia.negociado += n.totalCentavos;
    dia.pago += recebido;
    dias.set(n.dataNegociacao, dia);
    empresas.add(empresa);
    negociado += n.totalCentavos;
    pago += recebido;
  }
  return {
    empresas: empresas.size, negociado, pago, aReceber: negociado - pago,
    dias: [...dias].sort(([a], [b]) => a.localeCompare(b)).map(([data, dia]) => ({
      data, empresas: dia.empresas.size, negociado: dia.negociado, pago: dia.pago,
      aReceber: dia.negociado - dia.pago,
    })),
  };
}
