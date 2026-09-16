// ============================================================================
// COMPONENTE: Painel de gerenciamento de leads (excluir em massa)
// ----------------------------------------------------------------------------
// Painel lateral com a lista de todos os leads cadastrados, para selecionar
// alguns (ou todos) e excluir de uma vez — útil depois de importar uma
// planilha errada, por exemplo. A exclusão é feita em lote, direto no
// servidor (ver DELETE em app/api/crm/leads/route.ts), não uma chamada por
// lead.
// ============================================================================
"use client";

import { useMemo, useState } from "react";
import type { LeadCrmResumo } from "../../lib/crm";
import { infoEstagio, formatarMoedaCompacta } from "../../lib/crm";
import { useToast } from "../ToastProvider";
import { IconClose, IconTrash } from "../Icons";

export default function GerenciarLeadsPainel({
  leads,
  onFechar,
  onExcluidos,
}: {
  leads: LeadCrmResumo[];
  onFechar: () => void;
  onExcluidos: (idsExcluidos: string[] | "todos") => void;
}) {
  const showToast = useToast();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [excluindo, setExcluindo] = useState(false);

  const leadsOrdenados = useMemo(() => [...leads].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [leads]);
  const todosSelecionados = leadsOrdenados.length > 0 && selecionados.size === leadsOrdenados.length;

  function alternarSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    setSelecionados(todosSelecionados ? new Set() : new Set(leadsOrdenados.map((l) => l.id)));
  }

  async function excluirSelecionados() {
    if (selecionados.size === 0) return;
    if (!window.confirm(`Excluir ${selecionados.size} lead(s) selecionado(s)? Essa ação não pode ser desfeita.`)) return;
    const ids = Array.from(selecionados);
    setExcluindo(true);
    try {
      const resposta = await fetch("/api/crm/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!resposta.ok) throw new Error("Não foi possível excluir os leads selecionados.");
      showToast(`${ids.length} lead(s) excluído(s).`);
      setSelecionados(new Set());
      onExcluidos(ids);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir leads.", "erro");
    } finally {
      setExcluindo(false);
    }
  }

  async function excluirTodos() {
    if (leadsOrdenados.length === 0) return;
    if (!window.confirm(`Excluir TODOS os ${leadsOrdenados.length} leads cadastrados? Essa ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    try {
      const resposta = await fetch("/api/crm/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todos: true }),
      });
      if (!resposta.ok) throw new Error("Não foi possível excluir os leads.");
      showToast("Todos os leads foram excluídos.");
      setSelecionados(new Set());
      onExcluidos("todos");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir leads.", "erro");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="crm-painel-overlay" onClick={onFechar}>
      <div className="crm-painel crm-painel-estreito" onClick={(e) => e.stopPropagation()}>
        <div className="crm-painel-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="crm-painel-nome">Gerenciar leads</div>
            <div className="crm-painel-sub">
              {leadsOrdenados.length} lead(s) cadastrado(s)
              {selecionados.size > 0 ? ` · ${selecionados.size} selecionado(s)` : ""}
            </div>
          </div>
          <button type="button" className="crm-icon-btn" onClick={onFechar} aria-label="Fechar">
            <IconClose size={16} />
          </button>
        </div>

        <div className="crm-gerenciar-toolbar">
          <label className="crm-gerenciar-checkbox-label">
            <input type="checkbox" checked={todosSelecionados} onChange={alternarTodos} disabled={leadsOrdenados.length === 0} />
            Selecionar todos
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="crm-btn crm-btn-danger crm-btn-sm"
              onClick={excluirSelecionados}
              disabled={excluindo || selecionados.size === 0}
            >
              <IconTrash size={14} /> Excluir selecionados
            </button>
            <button
              type="button"
              className="crm-btn crm-btn-danger crm-btn-sm"
              onClick={excluirTodos}
              disabled={excluindo || leadsOrdenados.length === 0}
            >
              <IconTrash size={14} /> Excluir todos
            </button>
          </div>
        </div>

        <div className="crm-painel-body crm-gerenciar-body">
          {leadsOrdenados.length === 0 && <p className="crm-hint">Nenhum lead cadastrado.</p>}

          <ul className="crm-gerenciar-lista">
            {leadsOrdenados.map((lead) => {
              const estagio = infoEstagio(lead.estagio);
              return (
                <li key={lead.id} className="crm-gerenciar-item">
                  <label className="crm-gerenciar-checkbox-label">
                    <input type="checkbox" checked={selecionados.has(lead.id)} onChange={() => alternarSelecao(lead.id)} />
                  </label>
                  <div className="crm-gerenciar-item-info">
                    <span className="crm-gerenciar-item-nome">{lead.nome}</span>
                    <span className="crm-gerenciar-item-meta">
                      {lead.cnpj || "Sem CNPJ"}
                      {lead.valorEmAberto ? ` · ${formatarMoedaCompacta(Number(lead.valorEmAberto))} em aberto` : ""}
                    </span>
                  </div>
                  <span className="crm-badge" style={{ color: estagio.cor, borderColor: estagio.cor }}>
                    {estagio.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="crm-painel-footer" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="crm-btn crm-btn-ghost" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
