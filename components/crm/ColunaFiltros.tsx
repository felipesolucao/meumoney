"use client";

import { type ColunaFiltroState, type OrdenacaoColuna } from "../../lib/crmQuadro";
import { IconSearch } from "../Icons";

export default function ColunaFiltros({ filtro, onMudar }: { filtro: ColunaFiltroState; onMudar: (novo: ColunaFiltroState) => void }) {
  return (
    <div className="crm-column-filtros">
      <div className="crm-col-search-wrap">
        <IconSearch size={12} />
        <input
          className="crm-col-search"
          placeholder="Buscar empresa..."
          aria-label="Buscar empresa neste grupo"
          value={filtro.busca}
          onChange={(e) => onMudar({ ...filtro, busca: e.target.value })}
        />
      </div>
      <div className="crm-col-filtro-linha">
        <select
          className="crm-col-filtro-select"
          value={filtro.ordenacao}
          onChange={(e) => onMudar({ ...filtro, ordenacao: e.target.value as OrdenacaoColuna })}
          aria-label="Ordenar empresas deste grupo"
          title="Ordenar empresas deste grupo"
        >
          <option value="manual">Ordem manual</option>
          <option value="parcelas_desc">Maior quantidade de parcelas</option>
          <option value="parcelas_asc">Menor quantidade de parcelas</option>
          <option value="valor_desc">Maior valor em aberto</option>
          <option value="valor_asc">Menor valor em aberto</option>
        </select>
      </div>
    </div>
  );
}
