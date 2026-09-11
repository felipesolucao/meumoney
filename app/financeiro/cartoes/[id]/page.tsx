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
import EditarCompraCartaoModal from "../../../../components/EditarCompraCartaoModal";
import { useToast } from "../../../../components/ToastProvider";
import { IconEdit, IconTrash, IconCheck, IconUndo, IconPlus, IconChevronDown } from "../../../../components/Icons";

type CartaoDetalhe = {
  id: string;
  nome: string;
  icone: string;
  limite: string | null; // Decimal do Prisma chega serializado como string
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

// ----------------------------------------------------------------------------
// Quantos dias faltam para uma data de vencimento (pode dar negativo, se já
// venceu). Comparamos usando os componentes UTC da data — o backend grava
// dataVencimento como meia-noite UTC (ver calcularDataVencimento em
// lib/cartao.ts) e formatarData() também lê em UTC, então fazemos o mesmo
// aqui pra não perder/ganhar 1 dia dependendo do fuso horário do navegador.
// ----------------------------------------------------------------------------
function diasParaVencimento(dataVencimentoISO: string): number {
  const vencimento = new Date(dataVencimentoISO);
  const vencimentoUTC = Date.UTC(vencimento.getUTCFullYear(), vencimento.getUTCMonth(), vencimento.getUTCDate());

  const hoje = new Date();
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const UM_DIA_MS = 1000 * 60 * 60 * 24;
  return Math.round((vencimentoUTC - hojeUTC) / UM_DIA_MS);
}

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

  // --- NOVO: dropdown "trocar de cartão" no topo — carrega a lista de todos
  // os cartões do usuário uma vez, pra alternar rapidamente entre eles sem
  // precisar voltar pra /financeiro/contas.
  const [todosCartoes, setTodosCartoes] = useState<{ id: string; nome: string; icone: string }[]>([]);
  useEffect(() => {
    fetch("/api/cartoes")
      .then((r) => r.json())
      .then((data: { id: string; nome: string; icone: string }[]) => setTodosCartoes(data));
  }, []);

  // --- NOVO: popup rápido "Ajustar valor" de uma compra da fatura ----------
  const [compraAjustando, setCompraAjustando] = useState<Compra | null>(null);

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

  async function salvarAjusteCompra(valor: number, novaData: string) {
    if (!compraAjustando) return;
    const res = await fetch(`/api/compras-cartao/${compraAjustando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor, dataCompra: novaData }),
    });
    if (res.ok) {
      showToast("Compra atualizada!");
      setCompraAjustando(null);
      carregarFatura();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Não foi possível atualizar a compra.", "erro");
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

  // --- Resumo do cartão: limite total, valor gasto na fatura atual e -------
  // --- quantos dias faltam para o vencimento --------------------------------
  const limiteNum = cartao.limite != null ? Number(cartao.limite) : null;
  const valorGasto = fatura ? Number(fatura.valorTotal) : 0;
  const percentualUsado = limiteNum && limiteNum > 0 ? Math.min(100, (valorGasto / limiteNum) * 100) : null;
  const dias = fatura ? diasParaVencimento(fatura.dataVencimento) : null;
  const vencida = dias !== null && dias < 0 && fatura?.status !== "paga";
  const textoDias =
    dias === null
      ? "—"
      : dias === 0
      ? "Vence hoje"
      : dias > 0
      ? `Faltam ${dias} dia${dias === 1 ? "" : "s"}`
      : `Venceu há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`;

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
        {/* ==================================================================== */}
        {/* NOVO: dropdown pra alternar rapidamente entre cartões, sem precisar   */}
        {/* voltar pra /financeiro/contas — mesma ideia do trocador de conta na   */}
        {/* tela de extrato da conta bancária.                                    */}
        {/* ==================================================================== */}
        {todosCartoes.length > 1 && (
          <div className="relative">
            <select
              value={cartao.id}
              onChange={(e) => router.push(`/financeiro/cartoes/${e.target.value}`)}
              className="w-full appearance-none rounded-md border border-border bg-card px-4 py-3 pr-10 font-semibold outline-none focus:border-primary"
              aria-label="Trocar de cartão"
            >
              {todosCartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone} {c.nome}
                </option>
              ))}
            </select>
            <IconChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        )}

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

        {/* ==================================================================== */}
        {/* NOVO: Resumo do cartão — limite total, valor gasto, dia de           */}
        {/* vencimento e quantos dias faltam pra vencer.                         */}
        {/* ==================================================================== */}
        <div className="card space-y-3">
          <p className="text-xs font-semibold tracking-wide text-muted">RESUMO DO CARTÃO</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted">Limite total</p>
              <p className="text-lg font-bold truncate">
                {limiteNum !== null ? formatarMoeda(limiteNum) : "Sem limite definido"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Valor gasto (fatura atual)</p>
              <p className="text-lg font-bold truncate" style={{ color: "var(--color-error)" }}>
                {carregando && !fatura ? "—" : formatarMoeda(valorGasto)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Dia de vencimento</p>
              <p className="text-lg font-bold">Dia {cartao.diaVencimento}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Faltam quantos dias</p>
              <p className="text-lg font-bold" style={{ color: vencida ? "var(--color-error)" : undefined }}>
                {textoDias}
              </p>
            </div>
          </div>

          {/* Barra de uso do limite — só aparece quando o cartão tem limite
              cadastrado, já que sem limite não faz sentido calcular %. */}
          {percentualUsado !== null && (
            <div>
              <div className="w-full h-2 rounded-full bg-background overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentualUsado}%`,
                    background: percentualUsado >= 90 ? "var(--color-error)" : "var(--color-primary)",
                  }}
                />
              </div>
              <p className="text-xs text-muted mt-1">{percentualUsado.toFixed(0)}% do limite usado nesta fatura</p>
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
              // O card inteiro é um link pra tela de detalhes da compra
              // (/financeiro/cartoes/compra/[id]) — os botões de ajustar/
              // excluir chamam preventDefault() pra não disparar a navegação.
              <Link
                key={compra.id}
                href={`/financeiro/cartoes/compra/${compra.id}`}
                className="card !py-3 flex items-center gap-3"
              >
                <span className="w-10 h-10 rounded-md bg-background flex items-center justify-center text-lg shrink-0">
                  {compra.categoria?.icone || "🧾"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-snug line-clamp-2">{compra.descricao}</p>
                  <p className="text-xs text-muted">
                    {[compra.categoria?.nome, formatarData(compra.dataCompra)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="font-bold shrink-0" style={{ color: "var(--color-error)" }}>
                  {formatarMoeda(compra.valor)}
                </p>
                {fatura.status === "aberta" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setCompraAjustando(compra);
                      }}
                      className="icon-btn !w-8 !h-8 text-muted shrink-0"
                      aria-label={`Ajustar valor de ${compra.descricao}`}
                    >
                      <IconEdit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        excluirCompra(compra.id);
                      }}
                      disabled={processando}
                      className="icon-btn !w-8 !h-8 text-error shrink-0"
                      aria-label={`Excluir ${compra.descricao}`}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <EditarCompraCartaoModal
        aberto={compraAjustando !== null}
        compra={compraAjustando && fatura ? { ...compraAjustando, fatura: { status: fatura.status } } : null}
        onFechar={() => setCompraAjustando(null)}
        onSalvar={salvarAjusteCompra}
      />
    </div>
  );
}
