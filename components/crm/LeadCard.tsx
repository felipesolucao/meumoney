// ============================================================================
// COMPONENTE: Card de um lead no quadro Kanban do CRM
// ----------------------------------------------------------------------------
// Puramente apresentacional — quem decide se ele está "fantasma" (na posição
// original enquanto é arrastado) ou "flutuante" (seguindo o dedo/cursor) é o
// <CrmBoard>, que também controla o pointerdown que inicia o arraste.
// ============================================================================
"use client";

import type { CSSProperties } from "react";
import type { LeadCrmResumo } from "../../lib/crm";
import { infoEstagio, diasParado, formatarMoedaCrm, DIAS_SEM_MOVIMENTO, faixaProgresso } from "../../lib/crm";

function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
}

export default function LeadCard({
  lead,
  onAbrir,
  onPointerDownArrastar,
  fantasma,
  flutuante,
  estiloFlutuante,
}: {
  lead: LeadCrmResumo;
  onAbrir: () => void;
  onPointerDownArrastar: (e: React.PointerEvent<HTMLDivElement>) => void;
  fantasma?: boolean;
  flutuante?: boolean;
  estiloFlutuante?: CSSProperties;
}) {
  const info = infoEstagio(lead.estagio);
  const dias = diasParado(lead.movimentadoEm);
  const parado = dias >= DIAS_SEM_MOVIMENTO;
  const faixa = faixaProgresso(lead.progresso);
  const temMeta = lead.quantidadeParcelas != null || lead.quantidadeColaboradores != null || lead.sindicatoPatronal;

  return (
    <div
      data-lead-id={lead.id}
      className={`crm-card${fantasma ? " is-ghost" : ""}${flutuante ? " is-floating" : ""}`}
      style={{ "--card-accent": info.cor, ...estiloFlutuante } as CSSProperties}
      onPointerDown={onPointerDownArrastar}
      onClick={flutuante ? undefined : onAbrir}
    >
      <div className="crm-card-top">
        <div className="crm-card-avatar">{iniciais(lead.nome)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="crm-card-name">{lead.nome}</div>
          {lead.cnpj && <div className="crm-card-cnpj">{lead.cnpj}</div>}
        </div>
        <span
          className="crm-card-days"
          style={{
            background: parado ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
            color: parado ? "#fca5a5" : "var(--crm-text-faint)",
          }}
          title={`${dias} dia(s) sem trocar de etapa`}
        >
          {dias}d
        </span>
      </div>

      {/* Valor em aberto da empresa — em destaque, é a informação mais
          importante do card pra cobrança/negociação. */}
      {lead.valorEmAberto != null && (
        <div className="crm-card-valores">
          <div>
            <span className="crm-card-value-label">Em aberto</span>
            <span className="crm-card-value">{formatarMoedaCrm(lead.valorEmAberto)}</span>
          </div>
          {lead.valorPago != null && (
            <div>
              <span className="crm-card-value-label">Pago</span>
              <span className="crm-card-value crm-card-value-pago">{formatarMoedaCrm(lead.valorPago)}</span>
            </div>
          )}
        </div>
      )}

      {temMeta && (
        <div className="crm-card-meta">
          {lead.quantidadeParcelas != null && <span className="crm-tag">{lead.quantidadeParcelas}x parcelas</span>}
          {lead.quantidadeColaboradores != null && <span className="crm-tag">{lead.quantidadeColaboradores} colab.</span>}
          {lead.sindicatoPatronal && <span className="crm-tag">{lead.sindicatoPatronal}</span>}
        </div>
      )}

      {/* Botão de WhatsApp bem visível (não só um ícone perdido no rodapé) —
          abre a conversa direto, sem precisar entrar no card. */}
      {lead.telefone && (
        <a
          className="crm-card-whatsapp"
          href={`https://wa.me/55${somenteDigitos(lead.telefone)}`}
          target="_blank"
          rel="noreferrer"
          title="Abrir conversa no WhatsApp"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconWhatsapp /> WhatsApp
        </a>
      )}

      <div className="crm-card-footer">
        <span className="crm-progress-badge" style={{ color: faixa.cor, borderColor: faixa.cor }}>
          <span className="crm-progress-dot" style={{ background: faixa.cor }} />
          {faixa.label} · {lead.progresso}%
        </span>
        <div className="crm-card-quick" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {lead.email && (
            <a href={`mailto:${lead.email}`} title="Enviar e-mail">
              <IconMail />
            </a>
          )}
        </div>
      </div>
      {lead.origem && <div className="crm-card-origem">{lead.origem}</div>}
    </div>
  );
}

function IconWhatsapp() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21a9 9 0 1 0-7.8-4.5L3 21l4.6-1.2A9 9 0 0 0 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.7 8.5c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .6.4.2.5.6 1.4.6 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4l-.4.4c-.1.1-.2.3-.1.5.2.4.7 1.1 1.4 1.7.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.5-.6c.2-.2.3-.2.6-.1l1.3.6c.2.1.4.2.4.4 0 .2 0 1-.4 1.4-.4.5-1.2.8-1.9.8-.5 0-1.9-.3-3.4-1.6-1.7-1.5-2.7-3.3-2.9-3.7-.1-.3-.7-1.3-.7-2.4 0-.9.4-1.3.6-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5.5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 6.5 12 13l8.5-6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
