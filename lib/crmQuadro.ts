import { ESTAGIOS, faixaProgresso, type FaixaProgressoId, type LeadCrmResumo } from "./crm";

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

export type OrdenacaoColuna = 'manual' | 'parcelas_desc' | 'parcelas_asc' | 'valor_desc' | 'valor_asc';
export type ColunaFiltroState = { busca: string; ordenacao: OrdenacaoColuna };
export const FILTRO_COLUNA_VAZIO: ColunaFiltroState = { busca: '', ordenacao: 'manual' };

export function aplicarFiltroColuna(lista: LeadCrmResumo[], filtro: ColunaFiltroState): LeadCrmResumo[] {
  const busca = filtro.busca.trim().toLowerCase();
  const resultado = busca ? lista.filter(lead => lead.nome.toLowerCase().includes(busca)) : [...lista];
  if (filtro.ordenacao === 'manual') return resultado;
  const campo = filtro.ordenacao.startsWith('parcelas_') ? 'quantidadeParcelas' : 'valorEmAberto';
  const direcao = filtro.ordenacao.endsWith('_asc') ? 1 : -1;
  return resultado.sort((a, b) => {
    const valorA = a[campo] == null ? null : Number(a[campo]);
    const valorB = b[campo] == null ? null : Number(b[campo]);
    // Sem informação fica no fim em ambas as direções; zero é um valor válido.
    const vazioA = valorA === null || !Number.isFinite(valorA);
    const vazioB = valorB === null || !Number.isFinite(valorB);
    if (vazioA || vazioB) return Number(vazioA) - Number(vazioB);
    return (Number(valorA) - Number(valorB)) * direcao;
  });
}

export function filtrarColunas(
  mapa: Map<string, LeadCrmResumo[]>,
  buscaNormalizada: string,
  filtroProgresso: FaixaProgressoId | "todos",
): Map<string, LeadCrmResumo[]> {
  if (!buscaNormalizada && filtroProgresso === "todos") return mapa;
  const filtrado = new Map<string, LeadCrmResumo[]>();
  for (const [estagio, lista] of mapa) {
    filtrado.set(
      estagio,
      lista.filter((l) => {
        const bateBusca = !buscaNormalizada || [l.nome, l.cnpj, l.telefone, l.email, l.sindicatoPatronal].some((v) => v?.toLowerCase().includes(buscaNormalizada));
        const bateProgresso = filtroProgresso === "todos" || faixaProgresso(l.progresso).id === filtroProgresso;
        return bateBusca && bateProgresso;
      }),
    );
  }
  return filtrado;
}
