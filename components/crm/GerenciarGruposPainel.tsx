// ============================================================================
// COMPONENTE: Painel de gerenciamento dos grupos/colunas do quadro
// ----------------------------------------------------------------------------
// Lista todos os estágios (visíveis e ocultos), permitindo ativar/desativar
// (toggle "visivel" — coluna some do quadro sem apagar os leads que estão
// nela) e renomear cada um. A ordem das colunas não é editada aqui: arraste
// o cabeçalho da própria coluna no quadro (ver CrmBoard.tsx).
// ============================================================================
"use client";

import { useState } from "react";
import type { EstagioConfigCrm } from "../../lib/crm";
import { useToast } from "../ToastProvider";
import { IconClose, IconEdit, IconCheck, IconUndo } from "../Icons";

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
            Desative um grupo pra tirar a coluna do quadro sem excluir os leads que estão nela, renomeie pra combinar com o seu funil, ou
            arraste o cabeçalho de uma coluna no próprio quadro pra mudar a posição dela.
          </p>

          <ul className="crm-grupos-lista">
            {estagios.map((estagio) => (
              <li key={estagio.id} className="crm-grupos-item">
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
                    {estagio.nomePersonalizado && <span className="crm-grupos-item-padrao">Padrão: {estagio.labelPadrao}</span>}
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
                      {estagio.nomePersonalizado && (
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
