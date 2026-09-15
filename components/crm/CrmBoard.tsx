// ============================================================================
// COMPONENTE: Quadro Kanban do CRM (produto separado, ver app/crm)
// ----------------------------------------------------------------------------
// Estado mora aqui: a lista de leads, a busca e os modais. O arrastar-e-
// soltar em si (Pointer Events, sem lib externa) vive em useKanbanDrag.ts —
// separado porque é uma mecânica isolada, sem relação com o que é renderizado.
//
// Estratégia de sincronização com o servidor:
//   - Criar/editar/excluir um lead único -> sempre busca a lista atualizada
//     de novo (baixo volume, prioriza simplicidade e consistência).
//   - Arrastar um card -> atualização otimista local (instantânea) + 1 ou 2
//     chamadas de API em segundo plano (ver useKanbanDrag) — aqui sim
//     compensa não esperar o servidor, porque acontece a cada arraste.
// ============================================================================
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LeadCrmResumo } from "../../lib/crm";
import { ESTAGIOS, formatarMoedaCompacta } from "../../lib/crm";
import LeadCard from "./LeadCard";
import LeadModal from "./LeadModal";
import ImportarModal from "./ImportarModal";
import KpiHeader from "./KpiHeader";
import { useKanbanDrag } from "./useKanbanDrag";
import { useToast } from "../ToastProvider";
import { IconArrowLeft, IconPlus, IconSearch, IconDocument } from "../Icons";

function agruparPorColuna(leads: LeadCrmResumo[]): Map<string, LeadCrmResumo[]> {
  const mapa = new Map<string, LeadCrmResumo[]>();
  for (const e of ESTAGIOS) mapa.set(e.id, []);
  for (const l of leads) {
    if (!mapa.has(l.estagio)) mapa.set(l.estagio, []);
    mapa.get(l.estagio)?.push(l);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => a.ordem - b.ordem);
  return mapa;
}

function filtrarColunas(mapa: Map<string, LeadCrmResumo[]>, buscaNormalizada: string): Map<string, LeadCrmResumo[]> {
  if (!buscaNormalizada) return mapa;
  const filtrado = new Map<string, LeadCrmResumo[]>();
  for (const [estagio, lista] of mapa) {
    filtrado.set(
      estagio,
      lista.filter((l) => [l.nome, l.cnpj, l.telefone, l.email, l.sindicatoPatronal].some((v) => v?.toLowerCase().includes(buscaNormalizada))),
    );
  }
  return filtrado;
}

export default function CrmBoard({ leadsIniciais }: { leadsIniciais: LeadCrmResumo[]; nomeUsuario?: string }) {
  const showToast = useToast();
  const [leads, setLeads] = useState<LeadCrmResumo[]>(leadsIniciais);
  const [busca, setBusca] = useState("");
  const [modalNovoEstagio, setModalNovoEstagio] = useState<string | null>(null);
  const [leadEditando, setLeadEditando] = useState<LeadCrmResumo | null>(null);
  const [modalImportar, setModalImportar] = useState(false);

  const { drag, overInfo, colBodyRefs, iniciarArraste } = useKanbanDrag(leads, setLeads, (msg) => showToast(msg, "erro"));

  async function recarregar() {
    try {
      const resposta = await fetch("/api/crm/leads");
      const dados = await resposta.json();
      if (resposta.ok) setLeads(dados);
    } catch {
      showToast("Não foi possível atualizar a lista de leads.", "erro");
    }
  }

  const buscaNormalizada = busca.trim().toLowerCase();
  const colunas = useMemo(() => filtrarColunas(agruparPorColuna(leads), buscaNormalizada), [leads, buscaNormalizada]);
  const leadArrastado = drag ? leads.find((l) => l.id === drag.id) : null;

  return (
    <div className="crm-app">
      <div className="crm-topbar">
        <Link href="/" className="crm-back">
          <IconArrowLeft size={14} /> Voltar ao MeuMoney
        </Link>

        <div className="crm-topbar-row">
          <div className="crm-title-wrap">
            <div>
              <div className="crm-title">CRM · Funil de leads</div>
              <div className="crm-subtitle">Arraste um card para mudar a etapa</div>
            </div>
          </div>

          <div className="crm-toolbar">
            <div className="crm-search-wrap">
              <IconSearch size={15} />
              <input
                className="crm-search"
                placeholder="Buscar por nome, CNPJ, telefone, e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setModalImportar(true)}>
              <IconDocument size={16} /> Importar planilha
            </button>
            <button type="button" className="crm-btn crm-btn-primary" onClick={() => setModalNovoEstagio(ESTAGIOS[0].id)}>
              <IconPlus size={16} /> Novo lead
            </button>
          </div>
        </div>

        <KpiHeader leads={leads} />
      </div>

      <div className="crm-board-scroll">
        {ESTAGIOS.map((estagio) => {
          const lista = colunas.get(estagio.id) ?? [];
          const valorColuna = lista.reduce((s, l) => s + (l.valorEmAberto ? Number(l.valorEmAberto) : 0), 0);
          const emArrasteAqui = overInfo?.estagio === estagio.id;

          return (
            <div className="crm-column" key={estagio.id}>
              <div className="crm-column-head">
                <div className="crm-column-head-top">
                  <span className="crm-column-dot" style={{ background: estagio.cor }} />
                  <span className="crm-column-title">{estagio.label}</span>
                  <span className="crm-column-count" style={{ background: estagio.corSuave, color: estagio.cor }}>
                    {lista.length}
                  </span>
                </div>
                {valorColuna > 0 && <div className="crm-column-sub">{formatarMoedaCompacta(valorColuna)} em aberto</div>}
              </div>

              <button type="button" className="crm-btn crm-btn-ghost crm-btn-sm crm-column-add" onClick={() => setModalNovoEstagio(estagio.id)}>
                <IconPlus size={13} /> Adicionar
              </button>

              <div
                className="crm-column-body"
                ref={(el) => {
                  if (el) colBodyRefs.current.set(estagio.id, el);
                  else colBodyRefs.current.delete(estagio.id);
                }}
              >
                {lista.length === 0 && !emArrasteAqui && <div className="crm-empty-column">Nenhum lead aqui.</div>}

                {lista.map((lead, indice) => (
                  <div key={lead.id}>
                    {emArrasteAqui && overInfo?.index === indice && <div className="crm-drop-indicator" />}
                    <LeadCard
                      lead={lead}
                      fantasma={drag?.id === lead.id}
                      onAbrir={() => setLeadEditando(lead)}
                      onPointerDownArrastar={(e) => iniciarArraste(lead, e)}
                    />
                  </div>
                ))}
                {emArrasteAqui && overInfo?.index === lista.length && <div className="crm-drop-indicator" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card "flutuante" seguindo o cursor/dedo durante o arraste */}
      {drag && leadArrastado && (
        <LeadCard
          lead={leadArrastado}
          flutuante
          fantasma={false}
          onAbrir={() => {}}
          onPointerDownArrastar={() => {}}
          estiloFlutuante={{ left: drag.x, top: drag.y, width: drag.width }}
        />
      )}

      {modalNovoEstagio && <LeadModal estagioInicial={modalNovoEstagio} onFechar={() => setModalNovoEstagio(null)} onSalvar={recarregar} />}

      {leadEditando && (
        <LeadModal
          leadInicial={leadEditando}
          onFechar={() => setLeadEditando(null)}
          onSalvar={recarregar}
          onExcluir={(id) => setLeads((prev) => prev.filter((l) => l.id !== id))}
        />
      )}

      {modalImportar && <ImportarModal onFechar={() => setModalImportar(false)} onImportado={recarregar} />}
    </div>
  );
}
