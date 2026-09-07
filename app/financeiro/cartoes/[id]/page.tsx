// ============================================================================
// PÁGINA: Extrato do cartão de crédito
// ----------------------------------------------------------------------------
// Mesmo padrão da tela de detalhe de categoria (app/financeiro/categorias/[id]):
// editar nome/ícone do cartão, MesSeletor pra navegar entre faturas (uma por
// mês/competência) e a lista de compras daquela fatura, com total e status
// (aberta / fechada — a pagar / paga). "Fechada" e "paga" batem com o
// Lancamento gerado automaticamente quando a fatura fecha (ver lib/cartao.ts).
//
// Dia de fechamento, dia de vencimento, limite e a conta que paga a fatura
// se editam em /financeiro/contas (evita duplicar o CartaoFormulario
// completo aqui também) — esta tela edita só nome/ícone, igual à de categoria.
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatarMoeda, formatarData } from "../../../../lib/financeiro";
import { EMOJIS_CATEGORIA } from "../../../../lib/emojisCategorias";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import MesSeletor from "../../../../components/MesSeletor";
import Badge, { tomEStatusFatura } from "../../../../components/Badge";
import { useToast } from "../../../../components/ToastProvider";
import { IconEdit, IconTrash, IconCheck, IconUndo, IconPlus } from "../../../../components/Icons";

type CartaoDetalhe = {
  id: string;
  nome: string;
  icone: string;
  diaFechamento: number;
  diaVencimento: number;
  conta: { nome: string; icone: string };
};

type Compra = {
  id: string;
  descricao: string;
  valor: string;
  dataCompra: string;
  categoria: { nome: string; icone: string } | null;
};

type Fatura = {
  id: string;
  anoReferencia: number;
  mesReferencia: number;
  dataFechamento: string;
  dataVencimento: string;
  valorTotal: string;
  status: "aberta" | "fechada" | "paga";
  lancamentoId: string | null;
  compras: Compra[];
};

export default function DetalheCartaoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const showToast = useToast();
  const hoje = new Date();

  const [cartao, setCartao] = useState<CartaoDetalhe | null>(null);
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [nomeForm, setNomeForm] = useState("");
  const [iconeForm, setIconeForm] = useState("💳");
  const [salvandoCartao, setSalvandoCartao] = useState(false);
  const [erroCartao, setErroCartao] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [processando, setProcessando] = useState(false);

  function carregarFatura() {
    setCarregando(true);
    fetch(`/api/cartoes/${params.id}/faturas?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then((data: { cartao: CartaoDetalhe; fatura: Fatura }) => {
        setCartao(data.cartao);
        setFatura(data.fatura);
        if (!editando) {
          setNomeForm(data.cartao.nome);
          setIconeForm(data.cartao.icone);
        }
        setCarregando(false);
      });
  }

  useEffect(carregarFatura, [params.id, ano, mes]);

  function iniciarEdicao() {
    if (!cartao) return;
    setNomeForm(cartao.nome);
    setIconeForm(cartao.icone);
    setEditando(true);
    setErroCartao("");
  }

  async function salvarCartao() {
    if (!cartao) return;
    if (!nomeForm.trim()) return setErroCartao("Dê um nome para o cartão.");
    setSalvandoCartao(true);
    const res = await fetch(`/api/cartoes/${cartao.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeForm.trim(), icone: iconeForm }),
    });
    setSalvandoCartao(false);
    if (!res.ok) {
      const data = await res.json();
      return setErroCartao(data.error || "Não foi possível salvar.");
    }
    setEditando(false);
    showToast("Cartão atualizado!");
    carregarFatura();
  }

  async function excluirCartao() {
    if (!cartao) return;
    setSalvandoCartao(true);
    const res = await fetch(`/api/cartoes/${cartao.id}`, { method: "DELETE" });
    setSalvandoCartao(false);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Não foi possível excluir o cartão.", "erro");
      return;
    }
    showToast("Cartão excluído.");
    router.push("/financeiro/contas");
  }

  async function marcarFaturaComoPaga() {
    if (!fatura?.lancamentoId) return;
    setProcessando(true);
    const res = await fetch(`/api/lancamentos/${fatura.lancamentoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "pagar" }),
    });
    setProcessando(false);
    if (res.ok) {
      showToast("Fatura paga!");
      carregarFatura();
    } else {
      showToast("Não foi possível marcar a fatura como paga.", "erro");
    }
  }

  async function reabrirFatura() {
    if (!fatura?.lancamentoId) return;
    setProcessando(true);
    const res = await fetch(`/api/lancamentos/${fatura.lancamentoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "reabrir" }),
    });
    setProcessando(false);
    if (res.ok) {
      showToast("Fatura reaberta.");
      carregarFatura();
    } else {
      showToast("Não foi possível reabrir a fatura.", "erro");
    }
  }

  async function excluirCompra(compraId: string) {
    if (!window.confirm("Excluir esta compra da fatura?")) return;
    setProcessando(true);
    const res = await fetch(`/api/compras-cartao/${compraId}`, { method: "DELETE" });
    setProcessando(false);
    if (res.ok) {
      showToast("Compra excluída.");
      carregarFatura();
    } else {
      const data = await res.json();
      showToast(data.error || "Não foi possível excluir.", "erro");
    }
  }

  if (carregando && !cartao) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro/contas" />
          <h1 className="text-2xl font-bold">Cartão</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Carregando...</p>
      </div>
    );
  }

  if (!cartao) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro/contas" />
          <h1 className="text-2xl font-bold">Cartão</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Cartão não encontrado.</p>
      </div>
    );
  }

  const { tom, texto } = fatura ? tomEStatusFatura(fatura.status) : { tom: "neutro" as const, texto: "" };

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro/contas" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Cartão</h1>
          <p className="text-sm text-muted mt-0.5">{cartao.conta.icone} Paga com {cartao.conta.nome}</p>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4 pb-4">
        {/* --- Cabeçalho do cartão: emoji, nome, editar/excluir ------------------ */}
        <div className="card space-y-4">
          {confirmarExclusao ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-error">Excluir "{cartao.nome}"? Faturas em aberto são perdidas.</span>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setConfirmarExclusao(false)} className="btn-chip bg-background text-foreground">
                  Cancelar
                </button>
                <button type="button" disabled={salvandoCartao} onClick={excluirCartao} className="btn-chip btn-danger !min-h-0">
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
              {erroCartao && <p className="text-error text-sm font-medium">{erroCartao}</p>}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditando(false)} className="btn-outline">
                  Cancelar
                </button>
                <button type="button" onClick={salvarCartao} disabled={salvandoCartao} className="btn-primary flex items-center justify-center gap-2">
                  <IconCheck size={16} /> {salvandoCartao ? "Salvando..." : "Salvar"}
                </button>
              </div>
              <p className="text-xs text-muted">
                Dia de fechamento, vencimento, limite e conta que paga se editam em{" "}
                <Link href="/financeiro/contas" className="text-primary font-semibold">
                  Contas
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="w-14 h-14 rounded-md bg-primary-subtle flex items-center justify-center text-2xl shrink-0">
                {cartao.icone}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate">{cartao.nome}</p>
                <p className="text-xs text-muted">
                  Fecha dia {cartao.diaFechamento} · Vence dia {cartao.diaVencimento}
                </p>
              </div>
              <button type="button" onClick={iniciarEdicao} className="icon-btn text-muted shrink-0" aria-label="Editar cartão">
                <IconEdit size={16} />
              </button>
              <button type="button" onClick={() => setConfirmarExclusao(true)} className="icon-btn text-error shrink-0" aria-label="Excluir cartão">
                <IconTrash size={16} />
              </button>
            </div>
          )}
        </div>

        {/* --- Mês + fatura -------------------------------------------------------- */}
        <div className="card">
          <MesSeletor
            ano={ano}
            mes={mes}
            onMudar={(a, m) => {
              setAno(a);
              setMes(m);
            }}
          />
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted">FATURA DO MÊS</p>
            {fatura && <Badge tom={tom}>{texto}</Badge>}
          </div>
          <p className="text-3xl font-extrabold" style={{ color: "var(--color-error)" }}>
            {carregando || !fatura ? "—" : formatarMoeda(fatura.valorTotal)}
          </p>
          {fatura && (
            <p className="text-xs text-muted">
              Fecha em {formatarData(fatura.dataFechamento)} · Vence em {formatarData(fatura.dataVencimento)}
            </p>
          )}

          {fatura?.status === "fechada" && (
            <button
              type="button"
              onClick={marcarFaturaComoPaga}
              disabled={processando}
              className="btn-primary flex items-center justify-center gap-2 !mt-3"
            >
              <IconCheck size={16} /> Marcar fatura como paga
            </button>
          )}
          {fatura?.status === "paga" && (
            <button
              type="button"
              onClick={reabrirFatura}
              disabled={processando}
              className="btn-outline flex items-center justify-center gap-2 !mt-3"
            >
              <IconUndo size={16} /> Reabrir fatura
            </button>
          )}
        </div>

        {/* --- Compras da fatura --------------------------------------------------- */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted">COMPRAS NESTE PERÍODO</p>
          {fatura?.status === "aberta" && (
            <Link href={`/financeiro/novo?cartaoId=${cartao.id}`} className="text-xs font-semibold text-primary-dark flex items-center gap-1">
              <IconPlus size={12} /> Nova compra
            </Link>
          )}
        </div>

        {carregando ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : !fatura || fatura.compras.length === 0 ? (
          <div className="card text-center text-muted text-sm">Nenhuma compra lançada neste período.</div>
        ) : (
          <div className="space-y-3">
            {fatura.compras.map((compra) => (
              <div key={compra.id} className="card !py-3 flex items-center gap-3">
                <span className="w-10 h-10 rounded-md bg-background flex items-center justify-center text-lg shrink-0">
                  {compra.categoria?.icone || "🧾"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{compra.descricao}</p>
                  <p className="text-xs text-muted">
                    {[compra.categoria?.nome, formatarData(compra.dataCompra)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="font-bold shrink-0" style={{ color: "var(--color-error)" }}>
                  {formatarMoeda(compra.valor)}
                </p>
                {fatura.status === "aberta" && (
                  <button
                    type="button"
                    onClick={() => excluirCompra(compra.id)}
                    disabled={processando}
                    className="icon-btn !w-8 !h-8 text-error shrink-0"
                    aria-label={`Excluir ${compra.descricao}`}
                  >
                    <IconTrash size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
