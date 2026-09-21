"use client";

import type { AlertaCrmResumo } from "../../lib/crm";
import PopupCentral from "../PopupCentral";
import { IconBell, IconCheck } from "../Icons";
import { useToast } from "../ToastProvider";

function formatarDataHora(data: string): string {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GrupoAlertas({
  titulo,
  alertas,
  vencido,
  onAbrirLead,
  onConcluir,
}: {
  titulo: string;
  alertas: AlertaCrmResumo[];
  vencido: boolean;
  onAbrirLead: (leadId: string) => void;
  onConcluir: (alertaId: string) => void;
}) {
  return (
    <section className="crm-alertas-grupo">
      <div className="crm-alertas-grupo-titulo">
        <span className={`crm-alertas-status-dot${vencido ? " is-vencido" : ""}`} />
        {titulo}
        <span className="crm-alertas-contagem">{alertas.length}</span>
      </div>
      {alertas.length === 0 ? (
        <div className="crm-alertas-vazio">Nenhum alerta neste grupo.</div>
      ) : (
        <div className="crm-alertas-lista">
          {alertas.map((alerta) => (
            <article key={alerta.id} className={`crm-alerta-card${vencido ? " is-vencido" : ""}`}>
              <button type="button" className="crm-alerta-empresa" onClick={() => onAbrirLead(alerta.lead.id)}>
                <strong>{alerta.lead.nome}</strong>
                {alerta.lead.cnpj && <span>{alerta.lead.cnpj}</span>}
              </button>
              <div className="crm-alerta-horario">
                <IconBell size={13} /> {formatarDataHora(alerta.alertaEm)}
              </div>
              <p>{alerta.observacao}</p>
              <div className="crm-alerta-acoes">
                <button type="button" className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => onAbrirLead(alerta.lead.id)}>
                  Abrir empresa
                </button>
                <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => onConcluir(alerta.id)}>
                  <IconCheck size={13} /> Concluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AlertasPainel({
  alertas,
  onFechar,
  onAtualizar,
  onAbrirLead,
}: {
  alertas: AlertaCrmResumo[];
  onFechar: () => void;
  onAtualizar: (alertas: AlertaCrmResumo[]) => void;
  onAbrirLead: (leadId: string) => void;
}) {
  const showToast = useToast();
  const agora = Date.now();
  const vencidos = alertas.filter((a) => new Date(a.alertaEm).getTime() <= agora);
  const aVencer = alertas.filter((a) => new Date(a.alertaEm).getTime() > agora);

  async function concluir(id: string) {
    try {
      const resposta = await fetch(`/api/crm/alertas/${id}`, { method: "PATCH" });
      if (!resposta.ok) throw new Error("Não foi possível concluir o alerta.");
      onAtualizar(alertas.filter((a) => a.id !== id));
      showToast("Alerta concluído.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao concluir alerta.", "erro");
    }
  }

  function abrirLead(id: string) {
    onFechar();
    onAbrirLead(id);
  }

  return (
    <PopupCentral titulo="Alertas de empresas" onFechar={onFechar} className="crm-alertas-dialog">
      <div className="crm-alertas-intro">Lembretes agendados no histórico de atendimentos, em ordem de vencimento.</div>
      <GrupoAlertas titulo="Vencido" alertas={vencidos} vencido onAbrirLead={abrirLead} onConcluir={concluir} />
      <GrupoAlertas titulo="À vencer" alertas={aVencer} vencido={false} onAbrirLead={abrirLead} onConcluir={concluir} />
    </PopupCentral>
  );
}
