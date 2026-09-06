// ============================================================================
// PÁGINA: Detalhe da categoria
// ----------------------------------------------------------------------------
// O "gerenciador" de uma categoria específica: trocar o emoji, renomear e ver
// os lançamentos que caem nela, filtrados por mês (mesmo seletor usado em
// Contas a pagar/receber). Excluir a categoria manda de volta pro índice.
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { TipoLancamento } from "../../../../lib/financeiro";
import { formatarMoeda } from "../../../../lib/financeiro";
import { EMOJIS_CATEGORIA } from "../../../../lib/emojisCategorias";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import MesSeletor from "../../../../components/MesSeletor";
import LancamentosLista, { LancamentoItem } from "../../../../components/LancamentosLista";
import { useToast } from "../../../../components/ToastProvider";
import { IconEdit, IconTrash, IconCheck } from "../../../../components/Icons";

type Categoria = { id: string; nome: string; icone: string; tipo: TipoLancamento };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function DetalheCategoriaPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const showToast = useToast();
  const hoje = new Date();

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [carregandoCategoria, setCarregandoCategoria] = useState(true);

  const [editando, setEditando] = useState(false);
  const [nomeForm, setNomeForm] = useState("");
  const [iconeForm, setIconeForm] = useState("💰");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [erroCategoria, setErroCategoria] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);
  const [carregandoLancamentos, setCarregandoLancamentos] = useState(true);

  // A categoria em si não tem um GET individual — busca a lista completa (sem
  // filtro de tipo) e encontra pelo id, o mesmo que a tela de índice já usa.
  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((data: Categoria[]) => {
        const encontrada = data.find((c) => c.id === params.id) || null;
        setCategoria(encontrada);
        if (encontrada) {
          setNomeForm(encontrada.nome);
          setIconeForm(encontrada.icone);
        }
        setCarregandoCategoria(false);
      });
  }, [params.id]);

  useEffect(() => {
    setCarregandoLancamentos(true);
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0);
    const de = `${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-${pad(inicio.getDate())}`;
    const ate = `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}`;

    fetch(`/api/lancamentos?categoriaId=${params.id}&de=${de}&ate=${ate}`)
      .then((r) => r.json())
      .then((data: LancamentoItem[]) => {
        const ordenado = [...data].sort(
          (a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime()
        );
        setLancamentos(ordenado);
        setCarregandoLancamentos(false);
      });
  }, [params.id, ano, mes]);

  const totalMes = useMemo(() => lancamentos.reduce((s, l) => s + Number(l.valor), 0), [lancamentos]);

  function iniciarEdicao() {
    if (!categoria) return;
    setNomeForm(categoria.nome);
    setIconeForm(categoria.icone);
    setEditando(true);
    setErroCategoria("");
  }

  async function salvarCategoria() {
    if (!categoria) return;
    if (!nomeForm.trim()) return setErroCategoria("Dê um nome para a categoria.");
    setSalvandoCategoria(true);
    const res = await fetch(`/api/categorias/${categoria.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeForm.trim(), icone: iconeForm }),
    });
    setSalvandoCategoria(false);
    if (!res.ok) {
      const data = await res.json();
      return setErroCategoria(data.error || "Não foi possível salvar.");
    }
    const atualizada: Categoria = await res.json();
    setCategoria(atualizada);
    setEditando(false);
    showToast("Categoria atualizada!");
  }

  async function excluirCategoria() {
    if (!categoria) return;
    setSalvandoCategoria(true);
    const res = await fetch(`/api/categorias/${categoria.id}`, { method: "DELETE" });
    setSalvandoCategoria(false);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Não foi possível excluir a categoria.", "erro");
      return;
    }
    showToast("Categoria excluída.");
    router.push("/financeiro/categorias");
  }

  if (carregandoCategoria) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro/categorias" />
          <h1 className="text-2xl font-bold">Categoria</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Carregando...</p>
      </div>
    );
  }

  if (!categoria) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro/categorias" />
          <h1 className="text-2xl font-bold">Categoria</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Categoria não encontrada.</p>
      </div>
    );
  }

  const corTotal = categoria.tipo === "receita" ? "var(--color-primary)" : "var(--color-error)";

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro/categorias" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Categoria</h1>
          <p className="text-sm text-muted mt-0.5">{categoria.tipo === "receita" ? "Receita" : "Despesa"}</p>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4 pb-4">
        {/* --- Cabeçalho da categoria: emoji, nome, editar/excluir --------------- */}
        <div className="card space-y-4">
          {confirmarExclusao ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-error">Excluir “{categoria.nome}”? Os lançamentos ficam sem categoria.</span>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setConfirmarExclusao(false)} className="btn-chip bg-background text-foreground">
                  Cancelar
                </button>
                <button type="button" disabled={salvandoCategoria} onClick={excluirCategoria} className="btn-chip btn-danger !min-h-0">
                  Excluir
                </button>
              </div>
            </div>
          ) : editando ? (
            <div className="space-y-4">
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
                  className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              {erroCategoria && <p className="text-error text-sm font-medium">{erroCategoria}</p>}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditando(false)} className="btn-outline">
                  Cancelar
                </button>
                <button type="button" onClick={salvarCategoria} disabled={salvandoCategoria} className="btn-primary flex items-center justify-center gap-2">
                  <IconCheck size={16} /> {salvandoCategoria ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="w-14 h-14 rounded-md bg-primary-subtle flex items-center justify-center text-2xl shrink-0">
                {categoria.icone}
              </span>
              <span className="font-bold text-lg flex-1 truncate">{categoria.nome}</span>
              <button type="button" onClick={iniciarEdicao} className="icon-btn text-muted shrink-0" aria-label="Editar categoria">
                <IconEdit size={16} />
              </button>
              <button type="button" onClick={() => setConfirmarExclusao(true)} className="icon-btn text-error shrink-0" aria-label="Excluir categoria">
                <IconTrash size={16} />
              </button>
            </div>
          )}
        </div>

        {/* --- Mês + total ------------------------------------------------------- */}
        <div className="card">
          <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
        </div>

        <div className="card">
          <p className="text-xs font-semibold tracking-wide text-muted">TOTAL NO MÊS</p>
          <p className="text-3xl font-extrabold mt-1" style={{ color: corTotal }}>
            {carregandoLancamentos ? "—" : formatarMoeda(totalMes)}
          </p>
          <p className="text-xs text-muted mt-1">{lancamentos.length} lançamento(s)</p>
        </div>

        {/* --- Lançamentos do mês nesta categoria --------------------------------- */}
        {carregandoLancamentos ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : (
          <LancamentosLista lancamentos={lancamentos} />
        )}
      </div>
    </div>
  );
}
