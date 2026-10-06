export type AlteracaoCrm = { campo: string; antes: string | null; depois: string | null };

// Lista explícita: anexos binários, dados de autenticação e timestamps internos
// nunca entram nos logs. Valores Decimal e number equivalentes não geram edição.
export const CAMPOS_HISTORICO: Record<string, string> = {
  nome: 'Nome', codigo: 'Código', cnpj: 'CNPJ', telefone: 'Telefone', telefone2: 'Telefone adicional',
  email: 'E-mail', sindicatoPatronal: 'Sindicato patronal', origem: 'Origem', observacoes: 'Observações',
  statusPlanilha: 'Status', valorEmAberto: 'Valor em aberto', valorTotalComJuros: 'Valor com juros',
  valorPago: 'Valor pago', quantidadeParcelas: 'Quantidade de parcelas', quantidadeColaboradores: 'Colaboradores',
  parcelaMaisAntiga: 'Parcela mais antiga', parcelaMaisRecente: 'Parcela mais recente', dataUltimoContato: 'Último contato',
  progresso: 'Progresso', estagio: 'Grupo', observacao: 'Observação do atendimento',
  tentativaNumero: 'Tentativa', dataTratativa: 'Data do atendimento', alertaEm: 'Data do alerta',
  alertaConcluidoEm: 'Alerta concluído em', arquivoNome: 'Anexo',
};
function valorHistorico(valor: unknown): string | null {
  if (valor == null) return null;
  if (valor instanceof Date) return valor.toISOString();
  return String(valor);
}
export function compararCamposCrm(antes: Record<string, unknown>, depois: Record<string, unknown>): AlteracaoCrm[] {
  return Object.keys(CAMPOS_HISTORICO).filter(campo => campo in depois).flatMap(campo => {
    const a = valorHistorico(antes[campo]);
    const b = valorHistorico(depois[campo]);
    const monetario = ['valorEmAberto', 'valorTotalComJuros', 'valorPago'].includes(campo);
    if (a === b || (monetario && a !== null && b !== null && Number(a) === Number(b))) return [];
    return [{ campo, antes: a, depois: b }];
  });
}
