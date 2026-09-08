// ============================================================================
// UTIL: intervalo de datas para o seletor "mês / período personalizado"
// ----------------------------------------------------------------------------
// Usado pela tela de Contratos (e reaproveitável por qualquer outra tela que
// venha a ter o mesmo seletor) pra transformar o estado do componente
// ContratosNoMes num intervalo [inicio, fim] pronto pra filtrar uma lista
// por "criadoEm" (ou qualquer outro campo de data).
// ============================================================================
export function calcularIntervaloPeriodo({
  personalizado,
  ano,
  mes,
  dataDe,
  dataAte,
}: {
  personalizado: boolean;
  ano: number;
  mes: number; // 0-11
  dataDe: string; // yyyy-mm-dd
  dataAte: string; // yyyy-mm-dd
}): { inicio: Date; fim: Date } {
  if (personalizado) {
    return { inicio: new Date(`${dataDe}T00:00:00`), fim: new Date(`${dataAte}T23:59:59`) };
  }
  return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59) };
}

export function isoHoje(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}
