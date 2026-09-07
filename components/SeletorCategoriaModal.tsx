// ============================================================================
// COMPONENTE: SeletorCategoriaModal
// ----------------------------------------------------------------------------
// Bottom sheet único que resolve as 3 necessidades da tela "Novo lançamento":
//   1) Escolher uma categoria existente (toca no ícone/nome da linha)
//   2) Criar uma categoria nova, com emoji à escolha, direto de um grid
//   3) Renomear ou excluir uma categoria já existente (ícone lápis/lixeira)
//
// Fica todo autocontido: o pai só passa a lista de categorias e recebe de
// volta a lista atualizada (onCategoriasAtualizadas) + a nova seleção
// (onSelecionar) — sem precisar saber como o CRUD funciona por baixo.
//
// BUG CORRIGIDO: o botão "Nova categoria" (fim da lista, dentro do sheet)
// ficava escondido atrás do menu flutuante inferior (BottomNav). Os dois
// usavam "z-50" — como o BottomNav é renderizado DEPOIS deste componente no
// RootLayout (ver app/layout.tsx), ele "ganhava" a disputa de empilhamento e
// cobria o sheet. Correção: o sheet passa a usar z-[60] (estritamente maior
// que o z-50 do menu), garantindo que o bottom sheet SEMPRE fique por cima —
// que é o comportamento esperado de qualquer bottom sheet. Também somamos
// env(safe-area-inset-bottom) no padding do miolo rolável, pra o botão nunca
// ficar colado (ou tampado) no home indicator do iPhone.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import type { TipoLancamento } from "../lib/financeiro";
import { EMOJIS_CATEGORIA } from "../lib/emojisCategorias";
import { useToast } from "./ToastProvider";
import { IconPlus, IconEdit, IconTrash, IconClose, IconCheck } from "./Icons";

type Categoria = { id: string; nome: string; icone: string; tipo: TipoLancamento };

interface Props {
  aberto: boolean;
  tipo: TipoLancamento;
  categorias: Categoria[];
  categoriaSelecionadaId: string;
  onFechar: () => void;
  onSelecionar: (id: string) => void;
  onCategoriasAtualizadas: (categorias: Categoria[]) => void;
}

type Modo = "lista" | "criar" | "editar";

export default function SeletorCategoriaModal({
  aberto,
  tipo,
  categorias,
  categoriaSelecionadaId,
  onFechar,
  onSelecionar,
  onCategoriasAtualizadas,
}: Props) {
  const showToast = useToast();
  const [modo, setModo] = useState<Modo>("lista");
  const [categoriaEditandoId, setCategoriaEditandoId] = useState("");
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState("");
  const [nomeForm, setNomeForm] = useState("");
  const [iconeForm, setIconeForm] = useState("💰");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Toda vez que o sheet abre, volta para a lista (não deixa "vazado" um
  // formulário de edição de uma vez anterior).
  useEffect(() => {
    if (aberto) {
      setModo("lista");
      setConfirmarExclusaoId("");
      setErro("");
    }
  }, [aberto]);

  if (!aberto) return null;

  function iniciarCriacao() {
    setModo("criar");
    setNomeForm("");
    setIconeForm(tipo === "receita" ? "💵" : "🧾");
    setErro("");
  }

  function iniciarEdicao(cat: Categoria) {
    setModo("editar");
    setCategoriaEditandoId(cat.id);
    setNomeForm(cat.nome);
    setIconeForm(cat.icone);
    setErro("");
  }

  function voltarParaLista() {
    setModo("lista");
    setErro("");
  }

  async function salvarForm() {
    if (!nomeForm.trim()) return setErro("Dê um nome para a categoria.");
    setSalvando(true);
    setErro("");

    if (modo === "criar") {
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
      onCategoriasAtualizadas([...categorias, nova].sort((a, b) => a.nome.localeCompare(b.nome)));
      onSelecionar(nova.id);
      showToast("Categoria criada!");
      setModo("lista");
    } else if (modo === "editar") {
      const res = await fetch(`/api/categorias/${categoriaEditandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeForm.trim(), icone: iconeForm }),
      });
      setSalvando(false);
      if (!res.ok) {
        const data = await res.json();
        return setErro(data.error || "Não foi possível salvar a categoria.");
      }
      const atualizada: Categoria = await res.json();
      onCategoriasAtualizadas(
        categorias
          .map((c) => (c.id === atualizada.id ? atualizada : c))
          .sort((a, b) => a.nome.localeCompare(b.nome))
      );
      showToast("Categoria atualizada!");
      setModo("lista");
    }
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
    const restante = categorias.filter((c) => c.id !== id);
    onCategoriasAtualizadas(restante);
    if (id === categoriaSelecionadaId) onSelecionar(restante[0]?.id || "");
    setConfirmarExclusaoId("");
    showToast("Categoria excluída.");
  }

  const tituloForm = modo === "criar" ? "Nova categoria" : "Editar categoria";

  return (
    // BUG CORRIGIDO: z-50 -> z-[60], estritamente acima do BottomNav (z-50) —
    // ver comentário completo no topo do arquivo.
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Fundo escurecido — toca fora do sheet pra fechar */}
      <div
        className="absolute inset-0"
        style={{ background: "rgb(var(--shadow-color) / 0.45)" }}
        onClick={onFechar}
      />

      <div className="relative w-full max-w-shell max-h-[85vh] bg-card rounded-t-xl shadow-overlay flex flex-col animate-[slideUp_0.18s_ease-out]">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-pill bg-muted-surface" />

        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-lg font-bold">
            {modo === "lista" ? `Categorias de ${tipo === "receita" ? "receita" : "despesa"}` : tituloForm}
          </h2>
          <button
            type="button"
            onClick={modo === "lista" ? onFechar : voltarParaLista}
            className="icon-btn"
            aria-label="Fechar"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* BUG CORRIGIDO: pb-6 -> pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]
            — o sheet já sobe acima do menu flutuante (z-[60] acima), mas em
            iPhones com home indicator o botão "Nova categoria" ainda ficava
            colado na borda física da tela sem esse respiro extra. */}
        <div className="overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {modo === "lista" && (
            <>
              {categorias.length === 0 && (
                <p className="text-sm text-muted py-6 text-center">Nenhuma categoria ainda. Crie a primeira abaixo.</p>
              )}
              <div className="list-gap">
                {categorias.map((cat) => (
                  <div key={cat.id}>
                    {confirmarExclusaoId === cat.id ? (
                      <div
                        className="card !py-3 flex items-center justify-between gap-3"
                        style={{ background: "var(--color-error-subtle)" }}
                      >
                        <span className="text-sm font-medium text-error">Excluir "{cat.nome}"?</span>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmarExclusaoId("")}
                            className="btn-chip bg-card text-foreground"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={salvando}
                            onClick={() => excluirCategoria(cat.id)}
                            className="btn-chip btn-danger !min-h-0"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`card !py-2.5 flex items-center gap-3 ${
                          cat.id === categoriaSelecionadaId ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelecionar(cat.id);
                            onFechar();
                          }}
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                          <span className="w-10 h-10 rounded-md bg-primary-subtle flex items-center justify-center text-lg shrink-0">
                            {cat.icone}
                          </span>
                          <span className="font-semibold truncate">{cat.nome}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(cat)}
                          className="icon-btn !w-9 !h-9 text-muted shrink-0"
                          aria-label={`Editar ${cat.nome}`}
                        >
                          <IconEdit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmarExclusaoId(cat.id)}
                          className="icon-btn !w-9 !h-9 text-error shrink-0"
                          aria-label={`Excluir ${cat.nome}`}
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={iniciarCriacao}
                className="btn-outline mt-4 flex items-center justify-center gap-2"
              >
                <IconPlus size={18} /> Nova categoria
              </button>
            </>
          )}

          {(modo === "criar" || modo === "editar") && (
            <div className="space-y-4 pt-1">
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
                  <span className="text-xs text-muted">Ou escolha um da lista abaixo</span>
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

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={voltarParaLista} className="btn-outline">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarForm}
                  disabled={salvando}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <IconCheck size={16} /> {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
