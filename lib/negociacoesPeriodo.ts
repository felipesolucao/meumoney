import type { Negociacao } from './negociacoes';

export type NegociacaoPeriodo = Negociacao & { totalParcelasAcordo?: number };

// Projeção só para consulta/exportação. Edições devem usar o acordo original.
export function negociacoesDoMes(negociacoes: NegociacaoPeriodo[], mes: string): NegociacaoPeriodo[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return [];
  return negociacoes.flatMap(n => {
    // Um pagamento transfere a parcela inteira para sua competência, preservando o vencimento original.
    const parcelas = n.parcelas.filter(p => {
      const referencia = p.pagoCentavos > 0 && p.dataPagamento ? p.dataPagamento : p.vencimento;
      return referencia.startsWith(`${mes}-`);
    });
    if (!parcelas.length) return [];
    return [{ ...n, totalParcelasAcordo: n.totalParcelasAcordo ?? n.parcelas.length, parcelas,
      totalCentavos: parcelas.reduce((total, p) => total + p.valorCentavos, 0) }];
  });
}
