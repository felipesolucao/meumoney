// ============================================================================
// COMPONENTE: Modal de novo lead / edição de lead do CRM
// ----------------------------------------------------------------------------
// Mesmo formulário serve para criar (leadInicial ausente) e editar (leadInicial
// preenchido) — só troca o método/URL da chamada e mostra o botão de excluir.
// ============================================================================
"use client";

import { useState } from "react";
import type { LeadCrmResumo } from "../../lib/crm";
import { ESTAGIOS } from "../../lib/crm";
import { useToast } from "../ToastProvider";

type FormState = {
  nome: string;
  estagio: string;
  valorEmAberto: string;
  quantidadeParcelas: string;
  quantidadeColaboradores: string;
  cnpj: string;
  telefone: string;
  telefone2: string;
  email: string;
  sindicatoPatronal: string;
  origem: string;
  observacoes: string;
};

function paraFormulario(lead?: LeadCrmResumo | null, estagioInicial?: string): FormState {
  return {
    nome: lead?.nome ?? "",
    estagio: lead?.estagio ?? estagioInicial ?? "primeira_tentativa",
    valorEmAberto: lead?.valorEmAberto != null ? String(lead.valorEmAberto) : "",
    quantidadeParcelas: lead?.quantidadeParcelas != null ? String(lead.quantidadeParcelas) : "",
    quantidadeColaboradores: lead?.quantidadeColaboradores != null ? String(lead.quantidadeColaboradores) : "",
    cnpj: lead?.cnpj ?? "",
    telefone: lead?.telefone ?? "",
    telefone2: lead?.telefone2 ?? "",
    email: lead?.email ?? "",
    sindicatoPatronal: lead?.sindicatoPatronal ?? "",
    origem: lead?.origem ?? "",
    observacoes: lead?.observacoes ?? "",
  };
}

export default function LeadModal({
  leadInicial,
  estagioInicial,
  onFechar,
  onSalvar,
  onExcluir,
}: {
  leadInicial?: LeadCrmResumo | null;
  estagioInicial?: string;
  onFechar: () => void;
  onSalvar: () => void;
  onExcluir?: (id: string) => void;
}) {
  const showToast = useToast();
  const [form, setForm] = useState<FormState>(() => paraFormulario(leadInicial, estagioInicial));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const editando = !!leadInicial;

  function campo<K extends keyof FormState>(chave: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [chave]: valor }));
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErro("Informe o nome do lead.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome,
        estagio: form.estagio,
        valorEmAberto: form.valorEmAberto === "" ? null : Number(form.valorEmAberto),
        quantidadeParcelas: form.quantidadeParcelas === "" ? null : Number(form.quantidadeParcelas),
        quantidadeColaboradores: form.quantidadeColaboradores === "" ? null : Number(form.quantidadeColaboradores),
        cnpj: form.cnpj || null,
        telefone: form.telefone || null,
        telefone2: form.telefone2 || null,
        email: form.email || null,
        sindicatoPatronal: form.sindicatoPatronal || null,
        origem: form.origem || null,
        observacoes: form.observacoes || null,
      };
      const url = leadInicial ? `/api/crm/leads/${leadInicial.id}` : "/api/crm/leads";
      const resposta = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível salvar o lead.");

      onSalvar();
      showToast(editando ? "Lead atualizado." : "Lead cadastrado.");
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!leadInicial) return;
    if (!window.confirm(`Excluir o lead "${leadInicial.nome}"? Essa ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    try {
      const resposta = await fetch(`/api/crm/leads/${leadInicial.id}`, { method: "DELETE" });
      if (!resposta.ok) throw new Error("Não foi possível excluir o lead.");
      onExcluir?.(leadInicial.id);
      showToast("Lead excluído.");
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="crm-modal-overlay" onClick={onFechar}>
      <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-head">
          <span className="crm-modal-title">{editando ? "Editar lead" : "Novo lead"}</span>
          <button type="button" className="crm-icon-btn" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="crm-modal-body">
          {erro && <div className="crm-error">{erro}</div>}

          <div className="crm-field">
            <label className="crm-label">Nome *</label>
            <input className="crm-input" value={form.nome} onChange={(e) => campo("nome", e.target.value)} placeholder="Nome do cliente/empresa" />
          </div>

          <div className="crm-field">
            <label className="crm-label">Etapa</label>
            <select className="crm-select" value={form.estagio} onChange={(e) => campo("estagio", e.target.value)}>
              {ESTAGIOS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label className="crm-label">Valor em aberto (R$)</label>
              <input
                className="crm-input"
                type="number"
                step="0.01"
                value={form.valorEmAberto}
                onChange={(e) => campo("valorEmAberto", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="crm-field">
              <label className="crm-label">Quantidade de parcelas</label>
              <input
                className="crm-input"
                type="number"
                value={form.quantidadeParcelas}
                onChange={(e) => campo("quantidadeParcelas", e.target.value)}
              />
            </div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label className="crm-label">Quantidade de colaboradores</label>
              <input
                className="crm-input"
                type="number"
                value={form.quantidadeColaboradores}
                onChange={(e) => campo("quantidadeColaboradores", e.target.value)}
              />
            </div>
            <div className="crm-field">
              <label className="crm-label">CNPJ</label>
              <input className="crm-input" value={form.cnpj} onChange={(e) => campo("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label className="crm-label">Telefone</label>
              <input className="crm-input" value={form.telefone} onChange={(e) => campo("telefone", e.target.value)} placeholder="(11) 90000-0000" />
            </div>
            <div className="crm-field">
              <label className="crm-label">Telefone 2</label>
              <input className="crm-input" value={form.telefone2} onChange={(e) => campo("telefone2", e.target.value)} />
            </div>
          </div>

          <div className="crm-field-row">
            <div className="crm-field">
              <label className="crm-label">E-mail</label>
              <input className="crm-input" type="email" value={form.email} onChange={(e) => campo("email", e.target.value)} />
            </div>
            <div className="crm-field">
              <label className="crm-label">Sindicato patronal</label>
              <input className="crm-input" value={form.sindicatoPatronal} onChange={(e) => campo("sindicatoPatronal", e.target.value)} />
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">Origem</label>
            <input
              className="crm-input"
              value={form.origem}
              onChange={(e) => campo("origem", e.target.value)}
              placeholder="WhatsApp, Instagram, Google Ads, indicação..."
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Observações</label>
            <textarea className="crm-textarea" value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
          </div>
        </div>

        <div className="crm-modal-footer">
          {editando ? (
            <button type="button" className="crm-btn crm-btn-danger" onClick={excluir} disabled={excluindo || salvando}>
              {excluindo ? "Excluindo..." : "Excluir"}
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="crm-btn crm-btn-ghost" onClick={onFechar}>
              Cancelar
            </button>
            <button type="button" className="crm-btn crm-btn-primary" onClick={salvar} disabled={salvando || excluindo}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
