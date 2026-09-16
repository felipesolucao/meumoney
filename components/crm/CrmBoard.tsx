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
import type { LeadCrmResumo, FaixaProgressoId, EstagioConfigCrm } from "../../lib/crm";
import { ESTAGIOS, FAIXAS_PROGRESSO, faixaProgresso, formatarMoedaCompacta } from "../../lib/crm";
import LeadCard from "./LeadCard";
import LeadPainel from "./LeadPainel";
import ImportarModal from "./ImportarModal";
import AutomacoesPainel from "./AutomacoesPainel";
import GerenciarLeadsPainel from "./GerenciarLeadsPainel";
import GerenciarGruposPainel from "./GerenciarGruposPainel";
import ColunaFiltros, { FILTRO_COLUNA_VAZIO, aplicarFiltroColuna, type ColunaFiltroState } from "./ColunaFiltros";
import KpiHeader from "./KpiHeader";
import CrmTopNav from "./CrmTopNav";
import { useKanbanDrag } from "./useKanbanDrag";
import { useToast } from "../ToastProvider";
import { IconPlus, IconSearch, IconDocument, IconUsers } from "../Icons";

type FiltroProgresso = FaixaProgressoId | "todos";

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

function filtrarColunas(
  mapa: Map<string, LeadCrmResumo[]>,
  buscaNormalizada: string,
  filtroProgresso: FiltroProgresso,
): Map<string, LeadCrmResumo[]> {
  if (!buscaNormalizada && filtroProgresso === "todos") return mapa;
  const filtrado = new Map<string, LeadCrmResumo[]>();
  for (const [estagio, lista] of mapa) {
    filtrado.set(
      estagio,
      lista.filter((l) => {
        const bateBusca = !buscaNormalizada || [l.nome, l.cnpj, l.telefone, l.email, l.sindicatoPatronal].some((v) => v?.toLowerCase().includes(buscaNormalizada));
        const bateProgresso = filtroProgresso === "todos" || faixaProgresso(l.progresso).id === filtroProgresso;
        return bateBusca && bateProgresso;
      }),
    );
  }
  return filtrado;
}

export default function CrmBoard({
  leadsIniciais,
  estagiosIniciais,
  nomeUsuario,
}: {
  leadsIniciais: LeadCrmResumo[];
  estagiosIniciais: EstagioConfigCrm[];
  nomeUsuario?: string;
}) {
  const showToast = useToast();
  const [leads, setLeads] = useState<LeadCrmResumo[]>(leadsIniciais);
  const [estagios, setEstagios] = useState<EstagioConfigCrm[]>(estagiosIniciais);
  const [busca, setBusca] = useState("");
  const [modalNovoEstagio, setModalNovoEstagio] = useState<string | null>(null);
  const [leadEditando, setLeadEditando] = useState<LeadCrmResumo | null>(null);
  const [modalImportar, setModalImportar] = useState(false);
  const [modalAutomacoes, setModalAutomacoes] = useState(false);
  const [modalGerenciar, setModalGerenciar] = useState(false);
  const [modalGerenciarGrupos, setModalGerenciarGrupos] = useState(false);
  const [filtroProgresso, setFiltroProgresso] = useState<FiltroProgresso>("todos");
  const [filtrosColuna, setFiltrosColuna] = useState<Record<string, ColunaFiltroState>>({});
  const [arrastandoColuna, setArrastandoColuna] = useState<string | null>(null);
  const [colunaSobre, setColunaSobre] = useState<string | null>(null);

  function filtroDaColuna(estagioId: string): ColunaFiltroState {
    return filtrosColuna[estagioId] ?? FILTRO_COLUNA_VAZIO;
  }

  function atualizarFiltroColuna(estagioId: string, novo: ColunaFiltroState) {
    setFiltrosColuna((prev) => ({ ...prev, [estagioId]: novo }));
  }

  // Arrastar o cabeçalho de uma coluna pra outra posição — mecânica separada
  // (HTML5 Drag and Drop nativo) do arrastar-e-soltar dos cards de lead, que
  // usa Pointer Events (ver useKanbanDrag). Persistida de uma vez ao soltar.
  function onColunaDragStart(e: React.DragEvent, id: string) {
    setArrastandoColuna(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onColunaDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id !== arrastandoColuna) setColunaSobre(id);
  }

  function onColunaDragEnd() {
    setArrastandoColuna(null);
    setColunaSobre(null);
  }

  async function onColunaDrop(e: React.DragEvent, destinoId: string) {
    e.preventDefault();
    const origemId = arrastandoColuna;
    setArrastandoColuna(null);
    setColunaSobre(null);
    if (!origemId || origemId === destinoId) return;

    const ordenados = [...estagios].sort((a, b) => a.ordem - b.ordem);
    const indiceOrigem = ordenados.findIndex((e) => e.id === origemId);
    const indiceDestino = ordenados.findIndex((e) => e.id === destinoId);
    if (indiceOrigem === -1 || indiceDestino === -1) return;
    const [movido] = ordenados.splice(indiceOrigem, 1);
    ordenados.splice(indiceDestino, 0, movido);
    const reordenados = ordenados.map((e, i) => ({ ...e, ordem: i }));
    setEstagios(reordenados);

    try {
      const resposta = await fetch("/api/crm/estagios/reordenar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idsNaOrdem: reordenados.map((e) => e.id) }),
      });
      if (resposta.ok) setEstagios(await resposta.json());
    } catch {
      showToast("Não foi possível salvar a nova ordem dos grupos.", "erro");
    }
  }

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
  const colunas = useMemo(
    () => filtrarColunas(agruparPorColuna(leads), buscaNormalizada, filtroProgresso),
    [leads, buscaNormalizada, filtroProgresso],
  );
  const leadArrastado = drag ? leads.find((l) => l.id === drag.id) : null;

  return (
    <div className="crm-app">
      <CrmTopNav nomeUsuario={nomeUsuario} />

      <div className="crm-topbar">
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
            <select
              className="crm-select"
              style={{ width: "auto" }}
              value={filtroProgresso}
              onChange={(e) => setFiltroProgresso(e.target.value as FiltroProgresso)}
              title="Filtrar por progresso"
            >
              <option value="todos">Progresso: todos</option>
              {FAIXAS_PROGRESSO.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} ({f.min}-{f.max}%)
                </option>
              ))}
            </select>
            <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setModalAutomacoes(true)}>
              <IconBolt /> Automações
            </button>
            <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setModalGerenciarGrupos(true)}>
              <IconColunas /> Gerenciar grupos
            </button>
            <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setModalImportar(true)}>
              <IconDocument size={16} /> Importar planilha
            </button>
            <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setModalGerenciar(true)}>
              <IconUsers size={16} /> Gerenciar leads
            </button>
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              onClick={() => setModalNovoEstagio(estagios.find((e) => e.visivel)?.id ?? ESTAGIOS[0].id)}
            >
              <IconPlus size={16} /> Novo lead
            </button>
          </div>
        </div>

        <KpiHeader leads={leads} />
      </div>

      <div className="crm-board-scroll">
        {estagios
          .filter((e) => e.visivel)
          .map((estagio) => {
          const filtroColuna = filtroDaColuna(estagio.id);
          const lista = aplicarFiltroColuna(colunas.get(estagio.id) ?? [], filtroColuna);
          const valorColuna = lista.reduce((s, l) => s + (l.valorEmAberto ? Number(l.valorEmAberto) : 0), 0);
          const emArrasteAqui = overInfo?.estagio === estagio.id;

          return (
            <div className="crm-column" key={estagio.id}>
              <div
                className={`crm-column-head${colunaSobre === estagio.id ? " is-drop-target" : ""}${arrastandoColuna === estagio.id ? " is-dragging" : ""}`}
                draggable
                onDragStart={(e) => onColunaDragStart(e, estagio.id)}
                onDragOver={(e) => onColunaDragOver(e, estagio.id)}
                onDrop={(e) => onColunaDrop(e, estagio.id)}
                onDragEnd={onColunaDragEnd}
                title="Arraste para mudar a posição do grupo"
              >
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

              <ColunaFiltros filtro={filtroColuna} onMudar={(novo) => atualizarFiltroColuna(estagio.id, novo)} />

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

      {modalNovoEstagio && (
        <LeadPainel estagioInicial={modalNovoEstagio} estagios={estagios} onFechar={() => setModalNovoEstagio(null)} onSalvar={recarregar} />
      )}

      {leadEditando && (
        <LeadPainel
          leadInicial={leadEditando}
          estagios={estagios}
          onFechar={() => setLeadEditando(null)}
          onSalvar={recarregar}
          onExcluir={(id) => setLeads((prev) => prev.filter((l) => l.id !== id))}
        />
      )}

      {modalImportar && <ImportarModal onFechar={() => setModalImportar(false)} onImportado={recarregar} />}
      {modalAutomacoes && <AutomacoesPainel estagios={estagios} onFechar={() => setModalAutomacoes(false)} />}

      {modalGerenciar && (
        <GerenciarLeadsPainel
          leads={leads}
          onFechar={() => setModalGerenciar(false)}
          onExcluidos={(idsExcluidos) =>
            setLeads((prev) => (idsExcluidos === "todos" ? [] : prev.filter((l) => !idsExcluidos.includes(l.id))))
          }
        />
      )}

      {modalGerenciarGrupos && (
        <GerenciarGruposPainel estagios={estagios} onFechar={() => setModalGerenciarGrupos(false)} onAtualizar={setEstagios} />
      )}
    </div>
  );
}

function IconBolt() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function IconColunas() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4" width="6" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14.5" y="4" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
