// ============================================================================
// COMPONENTE: Automações do CRM
// ----------------------------------------------------------------------------
// Regras "se status da planilha for X e/ou progresso estiver entre Y e Z,
// mover para a etapa W" — avaliadas (nesta ordem) toda vez que um lead é
// criado, editado ou importado. Ver lib/crm.ts (encontrarEstagioAutomatico) e
// lib/crmAutomacao.ts (aplicação no servidor).
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import type { RegraAutomacaoCrm } from "../../lib/crm";
import { ESTAGIOS, infoEstagio } from "../../lib/crm";
import { useToast } from "../ToastProvider";
import { IconTrash } from "../Icons";

type NovaRegra = { nome: string; statusPlanilha: string; progressoMin: string; progressoMax: string; estagioDestino: string };

const REGRA_VAZIA: NovaRegra = { nome: "", statusPlanilha: "", progressoMin: "", progressoMax: "", estagioDestino: ESTAGIOS[0].id };

export default function AutomacoesPainel({ onFechar }: { onFechar: () => void }) {
  const showToast = useToast();
  const [regras, setRegras] = useState<RegraAutomacaoCrm[] | null>(null);
  const [nova, setNova] = useState<NovaRegra>(REGRA_VAZIA);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/crm/automacoes")
      .then((r) => r.json())
      .then(setRegras)
      .catch(() => showToast("Não foi possível carregar as automações.", "erro"));
  }, []);

  async function alternarAtivo(regra: RegraAutomacaoCrm) {
    const resposta = await fetch(`/api/crm/automacoes/${regra.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !regra.ativo }),
    });
    if (resposta.ok) {
      const atualizada = await resposta.json();
      setRegras((prev) => (prev ?? []).map((r) => (r.id === regra.id ? atualizada : r)));
    }
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir esta regra de automação?")) return;
    const resposta = await fetch(`/api/crm/automacoes/${id}`, { method: "DELETE" });
    if (resposta.ok) setRegras((prev) => (prev ?? []).filter((r) => r.id !== id));
  }

  async function criar() {
    if (!nova.nome.trim()) {
      showToast("Dê um nome para a regra.", "erro");
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch("/api/crm/automacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nova.nome,
          statusPlanilha: nova.statusPlanilha || null,
          progressoMin: nova.progressoMin === "" ? null : Number(nova.progressoMin),
          progressoMax: nova.progressoMax === "" ? null : Number(nova.progressoMax),
          estagioDestino: nova.estagioDestino,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível criar a regra.");
      setRegras((prev) => [...(prev ?? []), dados]);
      setNova(REGRA_VAZIA);
      showToast("Automação criada.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao criar automação.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="crm-modal-overlay" onClick={onFechar}>
      <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-head">
          <span className="crm-modal-title">Automações do funil</span>
          <button type="button" className="crm-icon-btn" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="crm-modal-body">
          <p className="crm-hint">
            Avaliadas em ordem: a primeira regra ativa cujas condições baterem move o lead pra etapa escolhida. Deixe uma condição em
            branco pra não restringir por ela.
          </p>

          {regras === null && <p className="crm-hint">Carregando...</p>}
          {regras?.length === 0 && <p className="crm-hint">Nenhuma automação criada ainda.</p>}

          {regras?.map((regra) => (
            <div key={regra.id} className="crm-field" style={{ border: "1px solid var(--crm-border)", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13.5 }}>
                  <input type="checkbox" checked={regra.ativo} onChange={() => alternarAtivo(regra)} />
                  {regra.nome}
                </label>
                <button type="button" className="crm-icon-btn" onClick={() => excluir(regra.id)} title="Excluir regra">
                  <IconTrash size={14} />
                </button>
              </div>
              <p className="crm-hint">
                {regra.statusPlanilha ? `Status = "${regra.statusPlanilha}"` : "Qualquer status"}
                {" · "}
                Progresso {regra.progressoMin ?? 0}-{regra.progressoMax ?? 100}%{" → "}
                <strong style={{ color: infoEstagio(regra.estagioDestino).cor }}>{infoEstagio(regra.estagioDestino).label}</strong>
              </p>
            </div>
          ))}

          <div className="crm-field" style={{ border: "1px dashed var(--crm-border-strong)", borderRadius: 10, padding: 12, gap: 10 }}>
            <span className="crm-label">Nova regra</span>
            <input className="crm-input" placeholder="Nome da regra" value={nova.nome} onChange={(e) => setNova((n) => ({ ...n, nome: e.target.value }))} />
            <div className="crm-field-row">
              <input
                className="crm-input"
                placeholder="Status da planilha (opcional)"
                value={nova.statusPlanilha}
                onChange={(e) => setNova((n) => ({ ...n, statusPlanilha: e.target.value }))}
              />
              <select
                className="crm-select"
                value={nova.estagioDestino}
                onChange={(e) => setNova((n) => ({ ...n, estagioDestino: e.target.value }))}
              >
                {ESTAGIOS.map((e) => (
                  <option key={e.id} value={e.id}>
                    Mover para: {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="crm-field-row">
              <input
                className="crm-input"
                type="number"
                placeholder="Progresso mínimo"
                value={nova.progressoMin}
                onChange={(e) => setNova((n) => ({ ...n, progressoMin: e.target.value }))}
              />
              <input
                className="crm-input"
                type="number"
                placeholder="Progresso máximo"
                value={nova.progressoMax}
                onChange={(e) => setNova((n) => ({ ...n, progressoMax: e.target.value }))}
              />
            </div>
            <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={criar} disabled={salvando}>
              {salvando ? "Criando..." : "Criar automação"}
            </button>
          </div>
        </div>

        <div className="crm-modal-footer" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="crm-btn crm-btn-ghost" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
