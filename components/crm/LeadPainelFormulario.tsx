// ============================================================================
// COMPONENTE: Formulário de dados do lead (dentro do LeadPainel)
// ----------------------------------------------------------------------------
// Separado do LeadPainel só pra manter o arquivo principal enxuto — não tem
// estado próprio, o painel é quem guarda o formulário e passa "campo()" pra
// atualizar cada valor.
// ============================================================================
"use client";

import { ESTAGIOS, faixaProgresso, FAIXAS_PROGRESSO } from "../../lib/crm";
import type { LeadPainelFormState } from "./LeadPainel";

export default function LeadPainelFormulario({
  form,
  campo,
  erro,
}: {
  form: LeadPainelFormState;
  campo: <K extends keyof LeadPainelFormState>(chave: K, valor: LeadPainelFormState[K]) => void;
  erro: string | null;
}) {
  const faixaAtual = faixaProgresso(form.progresso);

  return (
    <div className="crm-painel-secao">
      <div className="crm-painel-secao-titulo">Dados principais</div>
      <div className="crm-field">
        <label className="crm-label">Nome *</label>
        <input className="crm-input" value={form.nome} onChange={(e) => campo("nome", e.target.value)} placeholder="Nome do cliente/empresa" />
      </div>
      <div className="crm-field-row">
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
        <div className="crm-field">
          <label className="crm-label">Status (planilha)</label>
          <input className="crm-input" value={form.statusPlanilha} onChange={(e) => campo("statusPlanilha", e.target.value)} />
        </div>
      </div>
      <div className="crm-field">
        <label className="crm-label">
          Progresso — {faixaAtual.label} ({form.progresso}%)
        </label>
        <div className="crm-painel-progresso-linha">
          <input type="range" min={0} max={100} value={form.progresso} onChange={(e) => campo("progresso", Number(e.target.value))} />
        </div>
        <p className="crm-hint">{FAIXAS_PROGRESSO.map((f) => `${f.label} ${f.min}-${f.max}%`).join(" · ")}</p>
      </div>

      <div className="crm-painel-secao-titulo" style={{ marginTop: 6 }}>
        Financeiro
      </div>
      <div className="crm-field-row">
        <div className="crm-field">
          <label className="crm-label">Valor em aberto (R$)</label>
          <input className="crm-input" type="number" step="0.01" value={form.valorEmAberto} onChange={(e) => campo("valorEmAberto", e.target.value)} />
        </div>
        <div className="crm-field">
          <label className="crm-label">Valor pago (R$)</label>
          <input className="crm-input" type="number" step="0.01" value={form.valorPago} onChange={(e) => campo("valorPago", e.target.value)} />
        </div>
      </div>
      <div className="crm-field-row">
        <div className="crm-field">
          <label className="crm-label">Quantidade de parcelas</label>
          <input className="crm-input" type="number" value={form.quantidadeParcelas} onChange={(e) => campo("quantidadeParcelas", e.target.value)} />
        </div>
        <div className="crm-field">
          <label className="crm-label">Nº colaboradores ativos</label>
          <input
            className="crm-input"
            type="number"
            value={form.quantidadeColaboradores}
            onChange={(e) => campo("quantidadeColaboradores", e.target.value)}
          />
        </div>
      </div>
      <div className="crm-field-row">
        <div className="crm-field">
          <label className="crm-label">Parcela mais antiga</label>
          <input className="crm-input" type="date" value={form.parcelaMaisAntiga} onChange={(e) => campo("parcelaMaisAntiga", e.target.value)} />
        </div>
        <div className="crm-field">
          <label className="crm-label">Parcela mais recente</label>
          <input className="crm-input" type="date" value={form.parcelaMaisRecente} onChange={(e) => campo("parcelaMaisRecente", e.target.value)} />
        </div>
      </div>

      <div className="crm-painel-secao-titulo" style={{ marginTop: 6 }}>
        Empresa e contato
      </div>
      <div className="crm-field-row">
        <div className="crm-field">
          <label className="crm-label">Código</label>
          <input className="crm-input" value={form.codigo} onChange={(e) => campo("codigo", e.target.value)} />
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
      <div className="crm-field-row">
        <div className="crm-field">
          <label className="crm-label">Origem</label>
          <input className="crm-input" value={form.origem} onChange={(e) => campo("origem", e.target.value)} placeholder="WhatsApp, indicação..." />
        </div>
        <div className="crm-field">
          <label className="crm-label">Data do último contato</label>
          <input className="crm-input" type="date" value={form.dataUltimoContato} onChange={(e) => campo("dataUltimoContato", e.target.value)} />
        </div>
      </div>
      <div className="crm-field">
        <label className="crm-label">Observações</label>
        <textarea className="crm-textarea" value={form.observacoes} onChange={(e) => campo("observacoes", e.target.value)} />
      </div>
      {erro && <div className="crm-error">{erro}</div>}
    </div>
  );
}
