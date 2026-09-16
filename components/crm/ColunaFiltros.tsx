// ============================================================================
// COMPONENTE: Filtros dentro de cada coluna do quadro (busca por empresa,
// quantidade de parcelas e valor em aberto)
// ----------------------------------------------------------------------------
// Cada coluna guarda seu próprio filtro (ver estado "filtrosColuna" em
// CrmBoard) — filtrar a coluna "Negociação" não mexe nas outras. Puramente
// apresentacional: quem aplica o filtro na lista é aplicarFiltroColuna, usada
// por CrmBoard antes de renderizar os cards.
// ============================================================================
"use client";

import type { LeadCrmResumo } from "../../lib/crm";
import { IconSearch } from "../Icons";

export type OperadorComparacao = "" | "menor" | "maior";

export type ColunaFiltroState = {
  busca: string;
  parcelasOp: OperadorComparacao;
  parcelasValor: string;
  valorOp: OperadorComparacao;
  valorValor: string;
};

export const FILTRO_COLUNA_VAZIO: ColunaFiltroState = {
  busca: "",
  parcelasOp: "",
  parcelasValor: "",
  valorOp: "",
  valorValor: "",
};

function bateComparacao(valor: number | null, operador: OperadorComparacao, referencia: number | null): boolean {
  if (!operador || referencia == null) return true;
  if (valor == null) return false;
  return operador === "menor" ? valor < referencia : valor > referencia;
}

export function aplicarFiltroColuna(lista: LeadCrmResumo[], filtro: ColunaFiltroState): LeadCrmResumo[] {
  const buscaEmpresa = filtro.busca.trim().toLowerCase();
  const parcelasReferencia = filtro.parcelasValor === "" ? null : Number(filtro.parcelasValor);
  const valorReferencia = filtro.valorValor === "" ? null : Number(filtro.valorValor);
  if (!buscaEmpresa && !filtro.parcelasOp && !filtro.valorOp) return lista;

  return lista.filter((l) => {
    if (buscaEmpresa && !l.nome.toLowerCase().includes(buscaEmpresa)) return false;
    if (!bateComparacao(l.quantidadeParcelas, filtro.parcelasOp, parcelasReferencia)) return false;
    if (!bateComparacao(l.valorEmAberto != null ? Number(l.valorEmAberto) : null, filtro.valorOp, valorReferencia)) return false;
    return true;
  });
}

export default function ColunaFiltros({ filtro, onMudar }: { filtro: ColunaFiltroState; onMudar: (novo: ColunaFiltroState) => void }) {
  return (
    <div className="crm-column-filtros">
      <div className="crm-col-search-wrap">
        <IconSearch size={12} />
        <input
          className="crm-col-search"
          placeholder="Buscar empresa..."
          value={filtro.busca}
          onChange={(e) => onMudar({ ...filtro, busca: e.target.value })}
        />
      </div>

      <div className="crm-col-filtro-linha">
        <select
          className="crm-col-filtro-select"
          value={filtro.parcelasOp}
          onChange={(e) => onMudar({ ...filtro, parcelasOp: e.target.value as OperadorComparacao })}
          title="Filtrar por quantidade de parcelas"
        >
          <option value="">Parcelas: todas</option>
          <option value="menor">Parcelas menor que</option>
          <option value="maior">Parcelas maior que</option>
        </select>
        <input
          className="crm-col-filtro-input"
          type="number"
          placeholder="Qtd"
          value={filtro.parcelasValor}
          onChange={(e) => onMudar({ ...filtro, parcelasValor: e.target.value })}
          disabled={!filtro.parcelasOp}
        />
      </div>

      <div className="crm-col-filtro-linha">
        <select
          className="crm-col-filtro-select"
          value={filtro.valorOp}
          onChange={(e) => onMudar({ ...filtro, valorOp: e.target.value as OperadorComparacao })}
          title="Filtrar por valor em aberto"
        >
          <option value="">Valor em aberto: todos</option>
          <option value="menor">Valor menor que</option>
          <option value="maior">Valor maior que</option>
        </select>
        <input
          className="crm-col-filtro-input"
          type="number"
          placeholder="R$"
          value={filtro.valorValor}
          onChange={(e) => onMudar({ ...filtro, valorValor: e.target.value })}
          disabled={!filtro.valorOp}
        />
      </div>
    </div>
  );
}
