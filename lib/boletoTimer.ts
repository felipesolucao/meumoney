export type BoletoTimer = { boletoEnviado?: boolean; boletoLembreteEm?: string | null };
export function segundosBoleto(boleto: BoletoTimer, agora: number): number | null {
  if (boleto.boletoEnviado || !boleto.boletoLembreteEm) return null;
  const prazo = Date.parse(boleto.boletoLembreteEm);
  return Number.isFinite(prazo) ? Math.max(0, Math.ceil((prazo - agora) / 1000)) : null;
}
export function textoTimerBoleto(segundos: number): string {
  return `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}
