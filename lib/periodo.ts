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

// ----------------------------------------------------------------------------
// BUG CORRIGIDO: usava d.toISOString().slice(0, 10), que converte pra UTC
// antes de cortar a data — errado pra "hoje", que precisa da data no fuso
// LOCAL do usuário. No Brasil (UTC-3), isso fazia "hoje" virar "amanhã" pra
// qualquer clique entre ~21h e meia-noite (a essa hora já é o dia seguinte
// em UTC): um lançamento marcado como "Hoje" às 22h nascia com a data de
// amanhã, então nunca aparecia nas listas/filtros de "hoje" depois — a causa
// de vários relatos de "isso não está aparecendo hoje". Usa getFullYear/
// getMonth/getDate (hora local) em vez de toISOString, como o resto do app
// já faz corretamente em outros lugares (ex: formatarISO em ResumoMesInicio).
// ----------------------------------------------------------------------------
function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoHoje(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
