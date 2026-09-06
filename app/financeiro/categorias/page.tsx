// ============================================================================
// PÁGINA: Categorias (índice)
// ----------------------------------------------------------------------------
// Lista as categorias de receita ou despesa (abas no topo). Cada linha leva
// para /financeiro/categorias/[id], onde mora o "gerenciador" de fato: trocar
// emoji, renomear e ver os lançamentos daquela categoria filtrados por mês.
// Aqui na lista dá pra criar uma categoria nova ou excluir direto.
// ============================================================================
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TipoLancamento } from "../../../lib/financeiro";
import { EMOJIS_CATEGORIA } from "../../../lib/emojisCategorias";
import BotaoVoltar from "../../../components/BotaoVoltar";
import { useToast } from "../../../components/ToastProvider";
import { IconPlus, IconTrash, IconCheck, IconChevronRight } from "../../../components/Icons";

type Categoria = { id: string; nome: string; icone: string; tipo: TipoLancamento };

export default function CategoriasPage() {
  const showToast = useToast();
  const [tipo, setTipo] = useState<TipoLancamento>("despesa");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [nomeForm, setNomeForm] = useState("");
  const [iconeForm, setIconeForm] = useState("🧾");
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setCarregando(true);
    setCriando(false);
    fetch(`/api/categorias?tipo=${tipo}`)
      .then((r) => r.json())
      .then((data: Categoria[]) => {
        setCategorias(data);
        setCarregando(false);
      });
  }, [tipo]);

  function iniciarCriacao() {
    setCriando(true);
    setNomeForm("");
    setIconeForm(tipo === "receita" ? "💵" : "🧾");
    setErro("");
  }

  async function criarCategoria() {
    if (!nomeForm.trim()) return setErro("Dê um nome para a categoria.");
    setSalvando(true);
    const res = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeForm.trim(), tipo, icone: iconeForm }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json();
      return setErro(data.error || "Não foi possível criar a categoria.");
    }
    const nova: Categoria = await res.json();
    setCategorias((c) => [...c, nova].sort((a, b) => a.nome.localeCompare(b.nome)));
    setCriando(false);
    showToast("Categoria criada!");
  }

  async function excluirCategoria(id: string) {
    setSalvando(true);
    const res = await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Não foi possível excluir a categoria.", "erro");
      return;
    }
    setCategorias((c) => c.filter((cat) => cat.id !== id));
    setConfirmarExclusaoId("");
    showToast("Categoria excluída.");
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro" />
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted mt-0.5">Emoji, nome e histórico por categoria</p>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo("despesa")}
            className={tipo === "despesa" ? "btn-danger !py-3.5" : "btn-outline !py-3.5"}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setTipo("receita")}
            className={tipo === "receita" ? "btn-primary !py-3.5" : "btn-outline !py-3.5"}
          >
            Receita
          </button>
        </div>

        {carregando ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : (
          <div className="list-gap">
            {categorias.length === 0 && !criando && (
              <div className="card text-center text-muted text-sm">Nenhuma categoria ainda.</div>
            )}
            {categorias.map((cat) =>
              confirmarExclusaoId === cat.id ? (
                <div
                  key={cat.id}
                  className="card !py-3 flex items-center justify-between gap-3"
                  style={{ background: "var(--color-error-subtle)" }}
                >
                  <span className="text-sm font-medium text-error">Excluir “{cat.nome}”?</span>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => setConfirmarExclusaoId("")} className="btn-chip bg-card text-foreground">
                      Cancelar
                    </button>
                    <button type="button" disabled={salvando} onClick={() => excluirCategoria(cat.id)} className="btn-chip btn-danger !min-h-0">
                      Excluir
                    </button>
                  </div>
                </div>
              ) : (
                <div key={cat.id} className="card !py-2.5 flex items-center gap-3">
                  <Link href={`/financeiro/categorias/${cat.id}`} className="flex-1 flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-md bg-primary-subtle flex items-center justify-center text-lg shrink-0">
                      {cat.icone}
                    </span>
                    <span className="font-semibold truncate">{cat.nome}</span>
                  </Link>
                  <IconChevronRight size={16} className="text-muted shrink-0" />
                  <button
                    type="button"
                    onClick={() => setConfirmarExclusaoId(cat.id)}
                    className="icon-btn !w-9 !h-9 text-error shrink-0"
                    aria-label={`Excluir ${cat.nome}`}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {criando ? (
          <div className="card space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted mb-2">EMOJI</p>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-14 h-14 rounded-md bg-primary-subtle flex items-center justify-center text-2xl shrink-0">
                  {iconeForm}
                </span>
                <input
                  value={iconeForm}
                  onChange={(e) => setIconeForm(e.target.value.slice(-2) || iconeForm)}
                  className="w-20 rounded-md border border-border px-3 py-3 text-center text-xl outline-none focus:border-primary"
                  aria-label="Emoji personalizado"
                />
              </div>
              <div className="grid grid-cols-8 gap-1.5 bg-background rounded-md p-2 max-h-40 overflow-y-auto">
                {EMOJIS_CATEGORIA.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => setIconeForm(e)}
                    className={`aspect-square rounded-sm flex items-center justify-center text-lg ${
                      iconeForm === e ? "bg-primary-subtle ring-2 ring-primary" : "hover:bg-card"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted mb-2">NOME</p>
              <input
                value={nomeForm}
                onChange={(e) => setNomeForm(e.target.value)}
                placeholder={tipo === "receita" ? "Ex: Salário" : "Ex: Mercado"}
                className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
                autoFocus
              />
            </div>
            {erro && <p className="text-error text-sm font-medium">{erro}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCriando(false)} className="btn-outline">
                Cancelar
              </button>
              <button type="button" onClick={criarCategoria} disabled={salvando} className="btn-primary flex items-center justify-center gap-2">
                <IconCheck size={16} /> {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={iniciarCriacao} className="btn-outline flex items-center justify-center gap-2">
            <IconPlus size={18} /> Nova categoria
          </button>
        )}
      </div>
    </div>
  );
}
