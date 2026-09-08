"use client";

import { useEffect, useState } from "react";
import ResumoMesInicio from "./ResumoMesInicio";
import { IconEdit, IconPlus, IconTrash } from "./Icons";

type Carteira = { id: string; nome: string };

export default function CarteirasInicio() {
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [gerenciando, setGerenciando] = useState(false);
  const [nome, setNome] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const resposta = await fetch("/api/carteiras");
    if (resposta.ok) setCarteiras(await resposta.json());
  }
  useEffect(() => { void carregar(); }, []);

  async function salvar() {
    if (!nome.trim()) return setErro("Dê um nome para a carteira.");
    setSalvando(true);
    const resposta = await fetch(editando ? `/api/carteiras/${editando}` : "/api/carteiras", {
      method: editando ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim() }),
    });
    const data = await resposta.json();
    setSalvando(false);
    if (!resposta.ok) return setErro(data.error || "Não foi possível salvar a carteira.");
    setNome("");
    setEditando(null);
    setErro("");
    await carregar();
    if (!editando) setSelecionada(data.id);
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir esta carteira? As contas continuarão disponíveis em Geral.")) return;
    const resposta = await fetch(`/api/carteiras/${id}`, { method: "DELETE" });
    if (!resposta.ok) return setErro("Não foi possível excluir a carteira.");
    if (selecionada === id) setSelecionada(null);
    if (editando === id) { setEditando(null); setNome(""); }
    await carregar();
  }

  return (
    <div className="home-wallets">
      <div className="mb-5">
        <div className="wallet-tabs" role="tablist" aria-label="Selecionar carteira">
          <button type="button" role="tab" aria-selected={selecionada === null} onClick={() => setSelecionada(null)} className={selecionada === null ? "wallet-tab wallet-tab-active" : "wallet-tab"}>
            Geral
          </button>
          {carteiras.map((carteira) => (
            <button key={carteira.id} type="button" role="tab" aria-selected={selecionada === carteira.id} onClick={() => setSelecionada(carteira.id)} className={selecionada === carteira.id ? "wallet-tab wallet-tab-active" : "wallet-tab"}>
              {carteira.nome}
            </button>
          ))}
          <button type="button" onClick={() => setGerenciando((aberto) => !aberto)} className="wallet-add" aria-label="Gerenciar carteiras">
            <IconPlus size={17} />
          </button>
        </div>
        <p className="text-xs text-muted mt-2">{selecionada === null ? "Todas as contas e carteiras" : "Dados desta carteira"}</p>
      </div>

      {gerenciando && (
        <div className="card mb-5 space-y-3">
          <div>
            <p className="font-bold">Suas carteiras</p>
            <p className="text-xs text-muted mt-0.5">Crie quantas quiser e vincule as contas em Contas.</p>
          </div>
          {carteiras.map((carteira) => (
            <div key={carteira.id} className="flex items-center gap-2 border-t border-border pt-3">
              <span className="flex-1 font-medium truncate">{carteira.nome}</span>
              <button type="button" className="icon-btn !w-8 !h-8 text-muted" aria-label={`Renomear ${carteira.nome}`} onClick={() => { setEditando(carteira.id); setNome(carteira.nome); setErro(""); }}><IconEdit size={14} /></button>
              <button type="button" className="icon-btn !w-8 !h-8 text-error" aria-label={`Excluir ${carteira.nome}`} onClick={() => void excluir(carteira.id)}><IconTrash size={14} /></button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void salvar(); }} placeholder={editando ? "Novo nome" : "Ex.: Pessoal, Empresa"} className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 py-2.5 outline-none focus:border-primary" />
            <button type="button" disabled={salvando} onClick={() => void salvar()} className="btn-chip text-white" style={{ background: "var(--color-primary)" }}>{editando ? "Salvar" : "Criar"}</button>
          </div>
          {editando && <button type="button" onClick={() => { setEditando(null); setNome(""); setErro(""); }} className="text-sm text-muted">Cancelar edição</button>}
          {erro && <p className="text-sm text-error">{erro}</p>}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-3">RESUMO DO MÊS</p>
        <ResumoMesInicio carteiraId={selecionada} />
      </div>
    </div>
  );
}
