// ============================================================================
// COMPONENTE: Cabeçalho de indicadores do CRM
// ----------------------------------------------------------------------------
// Números e porcentagens do funil inteiro (não é afetado pela busca) — pedido
// explícito do usuário para "saber números e porcentagem" de cima, igual ao
// print de referência (BACKLOG ACTIVO / SIN MOVIMIENTO).
// ============================================================================
"use client";

import { useMemo } from "react";
import type { LeadCrmResumo } from "../../lib/crm";
import { ESTAGIOS_ENCERRADOS, DIAS_SEM_MOVIMENTO, diasParado, formatarMoedaCompacta } from "../../lib/crm";

export default function KpiHeader({ leads }: { leads: LeadCrmResumo[] }) {
  const dados = useMemo(() => {
    const total = leads.length;
    const ativos = leads.filter((l) => !ESTAGIOS_ENCERRADOS.includes(l.estagio));
    const semMovimento = ativos.filter((l) => diasParado(l.movimentadoEm) >= DIAS_SEM_MOVIMENTO);
    const valorAberto = ativos.reduce((soma, l) => soma + (l.valorEmAberto ? Number(l.valorEmAberto) : 0), 0);
    const negociados = leads.filter((l) => l.estagio === "negociado" || l.estagio === "aguardando_pagamento");
    const cancelados = leads.filter((l) => l.estagio === "cancelado" || l.estagio === "a_cancelar");
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return {
      total,
      ativos: ativos.length,
      semMovimento: semMovimento.length,
      valorAberto,
      negociados: negociados.length,
      cancelados: cancelados.length,
      pct,
    };
  }, [leads]);

  return (
    <div className="crm-kpis">
      <div className="crm-kpi">
        <div className="crm-kpi-label">Backlog ativo</div>
        <div className="crm-kpi-value">{dados.ativos}</div>
        <div className="crm-kpi-sub">de {dados.total} oportunidades no total</div>
      </div>
      <div className="crm-kpi crm-kpi--warn">
        <div className="crm-kpi-label">Sem movimento</div>
        <div className="crm-kpi-value">{dados.semMovimento}</div>
        <div className="crm-kpi-sub">mais de {DIAS_SEM_MOVIMENTO} dias parado</div>
      </div>
      <div className="crm-kpi crm-kpi--accent">
        <div className="crm-kpi-label">Valor em aberto</div>
        <div className="crm-kpi-value">{formatarMoedaCompacta(dados.valorAberto)}</div>
        <div className="crm-kpi-sub">soma do backlog ativo</div>
      </div>
      <div className="crm-kpi crm-kpi--success">
        <div className="crm-kpi-label">Negociado</div>
        <div className="crm-kpi-value">{dados.negociados}</div>
        <div className="crm-kpi-sub">{dados.pct(dados.negociados)}% do total</div>
      </div>
      <div className="crm-kpi crm-kpi--danger">
        <div className="crm-kpi-label">Cancelado</div>
        <div className="crm-kpi-value">{dados.cancelados}</div>
        <div className="crm-kpi-sub">{dados.pct(dados.cancelados)}% do total</div>
      </div>
    </div>
  );
}
