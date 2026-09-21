// ============================================================================
// COMPONENTE: Histórico de atendimentos de um lead
// ----------------------------------------------------------------------------
// Vive dentro do painel do lead (ver LeadPainel.tsx), no lugar do "chat" —
// timeline de tentativas/observações com edição e exclusão, mais um formulário
// pra registrar uma nova. Busca e salva direto, sem depender do formulário
// principal do lead (edições aqui não exigem clicar em "Salvar" lá em cima).
// ============================================================================
"use client";

import { useEffect, useRef, useState } from "react";
import type { AtendimentoCrmResumo } from "../../lib/crm";
import { formatarDataCrm } from "../../lib/crm";
import { IconEdit, IconTrash, IconCheck, IconClose, IconDocument, IconBell } from "../Icons";
import { useToast } from "../ToastProvider";

function paraInputDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function lerRespostaJson<T>(resposta: Response): Promise<T> {
  const texto = await resposta.text();

  if (!texto) {
    throw new Error(resposta.ok ? "O servidor retornou uma resposta vazia." : "Não foi possível concluir a operação.");
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }
}

export default function AtendimentosHistorico({ leadId }: { leadId: string }) {
  const showToast = useToast();
  const [itens, setItens] = useState<AtendimentoCrmResumo[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");

  const [novaObservacao, setNovaObservacao] = useState("");
  const [novaTentativa, setNovaTentativa] = useState("");
  const [novaData, setNovaData] = useState(() => paraInputDatetime(new Date().toISOString()));
  const [novoAlertaEm, setNovoAlertaEm] = useState("");
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      try {
        const resposta = await fetch(`/api/crm/leads/${leadId}/atendimentos`);
        const dados = await lerRespostaJson<AtendimentoCrmResumo[] | { error?: string }>(resposta);
        if (!resposta.ok) {
          throw new Error(!Array.isArray(dados) && dados.error ? dados.error : "Não foi possível carregar o histórico.");
        }
        if (!cancelado) setItens(dados as AtendimentoCrmResumo[]);
      } catch (e) {
        if (!cancelado) showToast(e instanceof Error ? e.message : "Erro ao carregar histórico.", "erro");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [leadId]);

  async function adicionar() {
    if (!novaObservacao.trim()) {
      showToast("Descreva o atendimento.", "erro");
      return;
    }
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.set("observacao", novaObservacao);
      if (novaTentativa) formData.set("tentativaNumero", novaTentativa);
      formData.set("dataTratativa", new Date(novaData).toISOString());
      if (novoAlertaEm) formData.set("alertaEm", new Date(novoAlertaEm).toISOString());
      if (novoArquivo) formData.set("arquivo", novoArquivo);

      const resposta = await fetch(`/api/crm/leads/${leadId}/atendimentos`, { method: "POST", body: formData });
      const dados = await lerRespostaJson<AtendimentoCrmResumo & { error?: string }>(resposta);
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível salvar.");
      setItens((prev) => [dados, ...(prev ?? [])]);
      setNovaObservacao("");
      setNovaTentativa("");
      setNovaData(paraInputDatetime(new Date().toISOString()));
      setNovoAlertaEm("");
      setNovoArquivo(null);
      if (inputArquivoRef.current) inputArquivoRef.current.value = "";
      if (dados.alertaEm) window.dispatchEvent(new Event("crm-alertas-atualizar"));
      showToast("Atendimento registrado.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar atendimento.", "erro");
    } finally {
      setEnviando(false);
    }
  }

  async function salvarEdicao(id: string) {
    if (!textoEdicao.trim()) return;
    try {
      const resposta = await fetch(`/api/crm/leads/${leadId}/atendimentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacao: textoEdicao }),
      });
      const dados = await lerRespostaJson<AtendimentoCrmResumo & { error?: string }>(resposta);
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível editar.");
      setItens((prev) => (prev ?? []).map((a) => (a.id === id ? dados : a)));
      setEditandoId(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao editar.", "erro");
    }
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir este atendimento do histórico?")) return;
    try {
      const resposta = await fetch(`/api/crm/leads/${leadId}/atendimentos/${id}`, { method: "DELETE" });
      if (!resposta.ok) throw new Error("Não foi possível excluir.");
      setItens((prev) => (prev ?? []).filter((a) => a.id !== id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir.", "erro");
    }
  }

  return (
    <div className="crm-painel-secao">
      <div className="crm-painel-secao-titulo">Histórico de atendimentos</div>

      <div className="crm-historico-lista">
        {carregando && <div className="crm-historico-vazio">Carregando...</div>}
        {!carregando && itens?.length === 0 && <div className="crm-historico-vazio">Nenhum atendimento registrado ainda.</div>}
        {!carregando &&
          itens?.map((atendimento) => (
            <div key={atendimento.id} className="crm-historico-item">
              <div className="crm-historico-item-topo">
                <span className="crm-historico-data">
                  {formatarDataCrm(atendimento.dataTratativa)}
                  {atendimento.tentativaNumero != null && ` · Tentativa ${atendimento.tentativaNumero}`}
                </span>
                {editandoId === atendimento.id ? (
                  <div className="crm-historico-acoes">
                    <button type="button" className="crm-icon-btn" onClick={() => salvarEdicao(atendimento.id)} title="Salvar">
                      <IconCheck size={14} />
                    </button>
                    <button type="button" className="crm-icon-btn" onClick={() => setEditandoId(null)} title="Cancelar">
                      <IconClose size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="crm-historico-acoes">
                    <button
                      type="button"
                      className="crm-icon-btn"
                      onClick={() => {
                        setEditandoId(atendimento.id);
                        setTextoEdicao(atendimento.observacao);
                      }}
                      title="Editar"
                    >
                      <IconEdit size={14} />
                    </button>
                    <button type="button" className="crm-icon-btn" onClick={() => excluir(atendimento.id)} title="Excluir">
                      <IconTrash size={14} />
                    </button>
                  </div>
                )}
              </div>
              {editandoId === atendimento.id ? (
                <textarea className="crm-textarea" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)} />
              ) : (
                <div className="crm-historico-texto">{atendimento.observacao}</div>
              )}
              {atendimento.arquivoNome && (
                <a
                  className="crm-historico-anexo"
                  href={`/api/crm/leads/${leadId}/atendimentos/${atendimento.id}/arquivo`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconDocument size={13} />
                  {atendimento.arquivoNome}
                  {atendimento.arquivoTamanho != null && <span> · {formatarTamanhoArquivo(atendimento.arquivoTamanho)}</span>}
                </a>
              )}
              {atendimento.alertaEm && (
                <div className={`crm-historico-alerta${atendimento.alertaConcluidoEm ? " is-concluido" : ""}`}>
                  <IconBell size={13} />
                  Revisar empresa em {new Date(atendimento.alertaEm).toLocaleString("pt-BR")}
                  {atendimento.alertaConcluidoEm && " · concluído"}
                </div>
              )}
            </div>
          ))}
      </div>

      <div className="crm-historico-form">
        <textarea
          className="crm-textarea"
          placeholder="Nova observação ou atendimento..."
          value={novaObservacao}
          onChange={(e) => setNovaObservacao(e.target.value)}
          style={{ minHeight: 60 }}
        />
        <div className="crm-historico-anexo-linha">
          <button type="button" className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => inputArquivoRef.current?.click()}>
            <IconDocument size={13} /> {novoArquivo ? "Trocar arquivo" : "Anexar arquivo"}
          </button>
          {novoArquivo && (
            <span className="crm-historico-anexo-selecionado">
              {novoArquivo.name}
              <button
                type="button"
                className="crm-icon-btn"
                onClick={() => {
                  setNovoArquivo(null);
                  if (inputArquivoRef.current) inputArquivoRef.current.value = "";
                }}
                title="Remover anexo"
              >
                <IconClose size={12} />
              </button>
            </span>
          )}
          <input
            ref={inputArquivoRef}
            type="file"
            hidden
            onChange={(e) => setNovoArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="crm-historico-form-linha">
          <input
            className="crm-input"
            type="number"
            placeholder="Nº tentativa"
            value={novaTentativa}
            onChange={(e) => setNovaTentativa(e.target.value)}
          />
          <input className="crm-input" type="datetime-local" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
          <button type="button" className="crm-btn crm-btn-primary crm-btn-sm" onClick={adicionar} disabled={enviando}>
            {enviando ? "Salvando..." : "Adicionar"}
          </button>
        </div>
        <div className="crm-field">
          <label className="crm-label crm-label-alerta">
            <IconBell size={13} /> Agendar alerta para revisar esta empresa (opcional)
          </label>
          <input
            className="crm-input"
            type="datetime-local"
            value={novoAlertaEm}
            min={paraInputDatetime(new Date().toISOString())}
            onChange={(e) => setNovoAlertaEm(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
