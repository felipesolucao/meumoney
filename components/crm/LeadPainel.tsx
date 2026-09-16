// ============================================================================
// COMPONENTE: Painel lateral do lead (substitui o popup central)
// ----------------------------------------------------------------------------
// Desliza da direita por cima do quadro — cabeçalho com avatar/etiquetas,
// formulário de dados à esquerda (ver LeadPainelFormulario.tsx) e histórico
// de atendimentos à direita (no lugar do "chat" de um CRM de verdade). Serve
// tanto pra criar quanto editar: sem leadInicial = formulário de criação
// (sem histórico ainda, precisa salvar primeiro).
// ============================================================================
"use client";

import { useState } from "react";
import type { LeadCrmResumo, EstagioConfigCrm } from "../../lib/crm";
import { infoEstagio, faixaProgresso } from "../../lib/crm";
import { useToast } from "../ToastProvider";
import AtendimentosHistorico from "./AtendimentosHistorico";
import LeadPainelFormulario from "./LeadPainelFormulario";
import BotaoCopiar from "./BotaoCopiar";
import { IconClose } from "../Icons";

export type LeadPainelFormState = {
  nome: string;
  estagio: string;
  codigo: string;
  cnpj: string;
  valorEmAberto: string;
  valorPago: string;
  quantidadeParcelas: string;
  quantidadeColaboradores: string;
  telefone: string;
  telefone2: string;
  email: string;
  sindicatoPatronal: string;
  origem: string;
  statusPlanilha: string;
  parcelaMaisAntiga: string;
  parcelaMaisRecente: string;
  dataUltimoContato: string;
  observacoes: string;
  progresso: number;
};

function paraInputDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function paraFormulario(lead?: LeadCrmResumo | null, estagioInicial?: string): LeadPainelFormState {
  return {
    nome: lead?.nome ?? "",
    estagio: lead?.estagio ?? estagioInicial ?? "primeira_tentativa",
    codigo: lead?.codigo ?? "",
    cnpj: lead?.cnpj ?? "",
    valorEmAberto: lead?.valorEmAberto != null ? String(lead.valorEmAberto) : "",
    valorPago: lead?.valorPago != null ? String(lead.valorPago) : "",
    quantidadeParcelas: lead?.quantidadeParcelas != null ? String(lead.quantidadeParcelas) : "",
    quantidadeColaboradores: lead?.quantidadeColaboradores != null ? String(lead.quantidadeColaboradores) : "",
    telefone: lead?.telefone ?? "",
    telefone2: lead?.telefone2 ?? "",
    email: lead?.email ?? "",
    sindicatoPatronal: lead?.sindicatoPatronal ?? "",
    origem: lead?.origem ?? "",
    statusPlanilha: lead?.statusPlanilha ?? "",
    parcelaMaisAntiga: paraInputDate(lead?.parcelaMaisAntiga ?? null),
    parcelaMaisRecente: paraInputDate(lead?.parcelaMaisRecente ?? null),
    dataUltimoContato: paraInputDate(lead?.dataUltimoContato ?? null),
    observacoes: lead?.observacoes ?? "",
    progresso: lead?.progresso ?? 0,
  };
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
}

function montarPayload(form: LeadPainelFormState) {
  return {
    nome: form.nome,
    estagio: form.estagio,
    codigo: form.codigo || null,
    cnpj: form.cnpj || null,
    valorEmAberto: form.valorEmAberto === "" ? null : Number(form.valorEmAberto),
    valorPago: form.valorPago === "" ? null : Number(form.valorPago),
    quantidadeParcelas: form.quantidadeParcelas === "" ? null : Number(form.quantidadeParcelas),
    quantidadeColaboradores: form.quantidadeColaboradores === "" ? null : Number(form.quantidadeColaboradores),
    telefone: form.telefone || null,
    telefone2: form.telefone2 || null,
    email: form.email || null,
    sindicatoPatronal: form.sindicatoPatronal || null,
    origem: form.origem || null,
    statusPlanilha: form.statusPlanilha || null,
    parcelaMaisAntiga: form.parcelaMaisAntiga || null,
    parcelaMaisRecente: form.parcelaMaisRecente || null,
    dataUltimoContato: form.dataUltimoContato || null,
    observacoes: form.observacoes || null,
    progresso: form.progresso,
  };
}

export default function LeadPainel({
  leadInicial,
  estagioInicial,
  estagios,
  onFechar,
  onSalvar,
  onExcluir,
}: {
  leadInicial?: LeadCrmResumo | null;
  estagioInicial?: string;
  estagios: EstagioConfigCrm[];
  onFechar: () => void;
  onSalvar: () => void;
  onExcluir?: (id: string) => void;
}) {
  const showToast = useToast();
  const [form, setForm] = useState<LeadPainelFormState>(() => paraFormulario(leadInicial, estagioInicial));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const editando = !!leadInicial;
  const infoAtual = infoEstagio(form.estagio);
  const faixaAtual = faixaProgresso(form.progresso);

  function campo<K extends keyof LeadPainelFormState>(chave: K, valor: LeadPainelFormState[K]) {
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
      const url = leadInicial ? `/api/crm/leads/${leadInicial.id}` : "/api/crm/leads";
      const resposta = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(montarPayload(form)),
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
    <div className="crm-painel-overlay" onClick={onFechar}>
      <div className="crm-painel" onClick={(e) => e.stopPropagation()}>
        <div className="crm-painel-header">
          <div className="crm-painel-avatar">{iniciais(form.nome || "?")}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="crm-painel-nome">
              {form.nome || "Novo lead"}
              {form.nome && <BotaoCopiar valor={form.nome} rotulo="nome" />}
            </div>
            <div className="crm-painel-sub">
              {editando && leadInicial ? `Cadastrado em ${new Date(leadInicial.criadoEm).toLocaleDateString("pt-BR")}` : "Preencha os dados e salve"}
            </div>
            <div className="crm-painel-tags">
              <span className="crm-badge" style={{ color: infoAtual.cor, borderColor: infoAtual.cor }}>
                {infoAtual.label}
              </span>
              <span className="crm-badge" style={{ color: faixaAtual.cor, borderColor: faixaAtual.cor }}>
                {faixaAtual.label} · {form.progresso}%
              </span>
              {form.statusPlanilha && (
                <span className="crm-badge" style={{ color: "var(--crm-text-muted)", borderColor: "var(--crm-border-strong)" }}>
                  {form.statusPlanilha}
                </span>
              )}
            </div>
          </div>
          <button type="button" className="crm-icon-btn" onClick={onFechar} aria-label="Fechar">
            <IconClose size={16} />
          </button>
        </div>

        <div className="crm-painel-body">
          <LeadPainelFormulario form={form} campo={campo} erro={erro} estagios={estagios} />

          {leadInicial ? (
            <AtendimentosHistorico leadId={leadInicial.id} />
          ) : (
            <div className="crm-painel-secao">
              <div className="crm-painel-secao-titulo">Histórico de atendimentos</div>
              <div className="crm-historico-vazio">Salve o lead primeiro para registrar atendimentos.</div>
            </div>
          )}
        </div>

        <div className="crm-painel-footer">
          {editando ? (
            <button type="button" className="crm-btn crm-btn-danger" onClick={excluir} disabled={excluindo || salvando}>
              {excluindo ? "Excluindo..." : "Excluir lead"}
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
