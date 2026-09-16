// ============================================================================
// COMPONENTE: Painel de gerenciamento dos grupos/colunas do quadro
// ----------------------------------------------------------------------------
// Lista todos os estágios (visíveis e ocultos, padrão e customizados),
// permitindo: reordenar (arrastar pela alça, mesmo modelo kanban do
// cabeçalho de coluna no quadro — ver CrmBoard.tsx), ativar/desativar
// (toggle "visivel" — coluna some do quadro sem apagar os leads que estão
// nela), renomear, e criar grupos novos além dos 11 padrão.
// ============================================================================
"use client";

import { useState } from "react";
import type { EstagioConfigCrm } from "../../lib/crm";
import { useToast } from "../ToastProvider";
import { IconClose, IconEdit, IconCheck, IconUndo, IconPlus } from "../Icons";

function IconAlca() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="6" r="1.6" fill="currentColor" />
      <circle cx="15" cy="6" r="1.6" fill="currentColor" />
      <circle cx="9" cy="12" r="1.6" fill="currentColor" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" />
      <circle cx="9" cy="18" r="1.6" fill="currentColor" />
      <circle cx="15" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

export default function GerenciarGruposPainel({
  estagios,
  onFechar,
  onAtualizar,
}: {
  estagios: EstagioConfigCrm[];
  onFechar: () => void;
  onAtualizar: (novos: EstagioConfigCrm[]) => void;
}) {
  const showToast = useToast();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [nomeNovoGrupo, setNomeNovoGrupo] = useState("");
  const [salvandoNovoGrupo, setSalvandoNovoGrupo] = useState(false);

  async function atualizarEstagio(id: string, corpo: { visivel?: boolean; nomePersonalizado?: string | null }) {
    setSalvandoId(id);
    try {
      const resposta = await fetch(`/api/crm/estagios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) throw new Error("Não foi possível salvar o grupo.");
      const novos = await resposta.json();
      onAtualizar(novos);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar grupo.", "erro");
    } finally {
      setSalvandoId(null);
    }
  }

  function iniciarEdicao(estagio: EstagioConfigCrm) {
    setEditandoId(estagio.id);
    setNomeEdicao(estagio.nomePersonalizado ?? estagio.label);
  }

  async function salvarNome(id: string) {
    if (!nomeEdicao.trim()) return;
    await atualizarEstagio(id, { nomePersonalizado: nomeEdicao.trim() });
    setEditandoId(null);
  }

  async function restaurarNomePadrao(estagio: EstagioConfigCrm) {
    await atualizarEstagio(estagio.id, { nomePersonalizado: null });
    if (editandoId === estagio.id) setEditandoId(null);
  }

  async function criarGrupo() {
    if (!nomeNovoGrupo.trim()) return;
    setSalvandoNovoGrupo(true);
    try {
      const resposta = await fetch("/api/crm/estagios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeNovoGrupo.trim() }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível criar o grupo.");
      onAtualizar(dados);
      setNomeNovoGrupo("");
      setCriando(false);
      showToast("Grupo criado.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao criar grupo.", "erro");
    } finally {
      setSalvandoNovoGrupo(false);
    }
  }

  // Arrastar pela alça reordena a lista — mesma mecânica (Drag and Drop
  // nativo) do cabeçalho das colunas no quadro, só que aqui dá pra reordenar
  // mesmo um grupo que esteja oculto no momento.
  async function onSoltar(destinoId: string) {
    const origemId = arrastando;
    setArrastando(null);
    setSobre(null);
    if (!origemId || origemId === destinoId) return;

    const ordenados = [...estagios].sort((a, b) => a.ordem - b.ordem);
    const indiceOrigem = ordenados.findIndex((e) => e.id === origemId);
    const indiceDestino = ordenados.findIndex((e) => e.id === destinoId);
    if (indiceOrigem === -1 || indiceDestino === -1) return;
    const [movido] = ordenados.splice(indiceOrigem, 1);
    ordenados.splice(indiceDestino, 0, movido);
    const reordenados = ordenados.map((e, i) => ({ ...e, ordem: i }));
    onAtualizar(reordenados);

    try {
      const resposta = await fetch("/api/crm/estagios/reordenar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idsNaOrdem: reordenados.map((e) => e.id) }),
      });
      if (resposta.ok) onAtualizar(await resposta.json());
    } catch {
      showToast("Não foi possível salvar a nova ordem dos grupos.", "erro");
    }
  }

  return (
    <div className="crm-modal-overlay" onClick={onFechar}>
      <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-head">
          <span className="crm-modal-title">Gerenciar grupos</span>
          <button type="button" className="crm-icon-btn" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="crm-modal-body">
          <p className="crm-hint">
            Arraste pela alça pra reordenar as colunas do quadro, desative um grupo pra tirar a coluna sem excluir os leads que estão
            nela, renomeie pra combinar com o seu funil, ou crie um grupo novo além dos padrão.
          </p>

          <ul className="crm-grupos-lista">
            {estagios.map((estagio) => (
              <li
                key={estagio.id}
                className={`crm-grupos-item${sobre === estagio.id ? " is-drop-target" : ""}${arrastando === estagio.id ? " is-dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (estagio.id !== arrastando) setSobre(estagio.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onSoltar(estagio.id);
                }}
              >
                <span
                  className="crm-grupos-item-alca"
                  draggable
                  onDragStart={(e) => {
                    setArrastando(estagio.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setArrastando(null);
                    setSobre(null);
                  }}
                  title="Arraste para reordenar"
                >
                  <IconAlca />
                </span>

                <span className="crm-column-dot" style={{ background: estagio.cor, flexShrink: 0 }} />

                {editandoId === estagio.id ? (
                  <input
                    className="crm-input crm-grupos-item-input"
                    value={nomeEdicao}
                    onChange={(e) => setNomeEdicao(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") salvarNome(estagio.id);
                      if (e.key === "Escape") setEditandoId(null);
                    }}
                  />
                ) : (
                  <div className="crm-grupos-item-info">
                    <span className="crm-grupos-item-nome">{estagio.label}</span>
                    {estagio.personalizado ? (
                      <span className="crm-grupos-item-padrao">Grupo criado por você</span>
                    ) : (
                      estagio.nomePersonalizado && <span className="crm-grupos-item-padrao">Padrão: {estagio.labelPadrao}</span>
                    )}
                  </div>
                )}

                <div className="crm-grupos-item-acoes">
                  {editandoId === estagio.id ? (
                    <>
                      <button type="button" className="crm-icon-btn" onClick={() => salvarNome(estagio.id)} title="Salvar nome">
                        <IconCheck size={14} />
                      </button>
                      <button type="button" className="crm-icon-btn" onClick={() => setEditandoId(null)} title="Cancelar">
                        <IconClose size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      {!estagio.personalizado && estagio.nomePersonalizado && (
                        <button
                          type="button"
                          className="crm-icon-btn"
                          onClick={() => restaurarNomePadrao(estagio)}
                          title="Restaurar nome padrão"
                          disabled={salvandoId === estagio.id}
                        >
                          <IconUndo size={14} />
                        </button>
                      )}
                      <button type="button" className="crm-icon-btn" onClick={() => iniciarEdicao(estagio)} title="Editar nome">
                        <IconEdit size={14} />
                      </button>
                    </>
                  )}

                  <label className="crm-toggle" title={estagio.visivel ? "Ocultar grupo" : "Mostrar grupo"}>
                    <input
                      type="checkbox"
                      checked={estagio.visivel}
                      disabled={salvandoId === estagio.id}
                      onChange={() => atualizarEstagio(estagio.id, { visivel: !estagio.visivel })}
                    />
                    <span className="crm-toggle-track" />
                    <span className="crm-toggle-thumb" />
                  </label>
                </div>
              </li>
            ))}
          </ul>

          {criando ? (
            <div className="crm-grupos-novo-form">
              <input
                className="crm-input"
                placeholder="Nome do novo grupo"
                value={nomeNovoGrupo}
                onChange={(e) => setNomeNovoGrupo(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") criarGrupo();
                  if (e.key === "Escape") setCriando(false);
                }}
              />
              <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={criarGrupo} disabled={salvandoNovoGrupo}>
                {salvandoNovoGrupo ? "Criando..." : "Criar"}
              </button>
              <button type="button" className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setCriando(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" className="crm-btn crm-btn-ghost crm-btn-sm crm-grupos-novo-btn" onClick={() => setCriando(true)}>
              <IconPlus size={13} /> Novo grupo
            </button>
          )}
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
