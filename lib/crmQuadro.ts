import { ESTAGIOS, type LeadCrmResumo } from "./crm";

export function agruparPorColuna(leads: LeadCrmResumo[]): Map<string, LeadCrmResumo[]> {
  const mapa = new Map<string, LeadCrmResumo[]>();
  for (const e of ESTAGIOS) mapa.set(e.id, []);
  for (const l of leads) {
    if (!mapa.has(l.estagio)) mapa.set(l.estagio, []);
    mapa.get(l.estagio)?.push(l);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => a.ordem - b.ordem);
  return mapa;
}

