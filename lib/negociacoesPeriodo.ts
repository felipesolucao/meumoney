import type { Negociacao } from './negociacoes';

export type CriterioPeriodo = 'negociacoes' | 'recebiveis' | 'recebimentos';

export type NegociacaoPeriodo = Negociacao & { totalParcelasAcordo?: number };

// Projeção só para consulta/exportação. Edições devem usar o acordo original.
export function negociacoesDoMes(negociacoes: NegociacaoPeriodo[], mes: string, criterio: CriterioPeriodo = 'recebiveis'): NegociacaoPeriodo[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return [];
  if (criterio === 'negociacoes') return negociacoes
    .filter(n => n.dataNegociacao.startsWith(`${mes}-`))
    .map(n => ({ ...n, totalParcelasAcordo: n.totalParcelasAcordo ?? n.parcelas.length }));
  return negociacoes.flatMap(n => {
    // Um pagamento transfere a parcela inteira para sua competência, preservando o vencimento original.
    const parcelas = n.parcelas.filter(p => {
      if (criterio === 'recebimentos') return p.pagoCentavos > 0 && !!p.dataPagamento && p.dataPagamento.startsWith(`${mes}-`);
      const referencia = p.pagoCentavos > 0 && p.dataPagamento ? p.dataPagamento : p.vencimento;
      return referencia.startsWith(`${mes}-`);
    });
    if (!parcelas.length) return [];
    return [{ ...n, totalParcelasAcordo: n.totalParcelasAcordo ?? n.parcelas.length, parcelas,
      totalCentavos: parcelas.reduce((total, p) => total + p.valorCentavos, 0) }];
  });
}

// null seleciona explicitamente todo o histórico, inclusive registros sem datas de parcelas.
export function negociacoesDoPeriodo(negociacoes: NegociacaoPeriodo[], mes: string | null, criterio: CriterioPeriodo = 'recebiveis'): NegociacaoPeriodo[] {
  return mes === null
    ? negociacoes.map(n => ({ ...n, totalParcelasAcordo: n.totalParcelasAcordo ?? n.parcelas.length }))
    : negociacoesDoMes(negociacoes, mes, criterio);
}

// Busca por nome do cliente ou do funil, ignorando acentos, e por documento/contrato.
export function correspondeBuscaNegociacao(n: Negociacao, busca: string): boolean {
  const normalizar = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  const termo = normalizar(busca);
  if (!termo) return true;
  const digitos = busca.replace(/\D/g, '');
  return [n.empresa, n.lead?.nome ?? '', n.codigoContrato ?? ''].some(v => normalizar(v).includes(termo))
    || (!!digitos && !/[a-z]/i.test(termo) && n.cnpj.replace(/\D/g, '').includes(digitos));
}
