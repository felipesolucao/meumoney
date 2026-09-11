// ============================================================================
// PÁGINA: Detalhes de uma compra do cartão de crédito
// ----------------------------------------------------------------------------
// Aberta ao tocar numa transação do extrato do cartão (ver
// app/financeiro/cartoes/[id]). Mostra os dados completos da compra e dá duas
// formas de editar:
//   - "Ajustar valor" -> popup rápido (EditarCompraCartaoModal), mesmo padrão
//     do EditarLancamentoModal usado em /financeiro/pagar e /financeiro/receber.
//   - "Editar detalhes completos" -> manda pra /financeiro/novo já em modo de
//     edição (?compraCartaoId=...), pra mexer em categoria/observações também.
// As duas opções (e a exclusão) só ficam disponíveis enquanto a fatura desta
// compra continuar "aberta" — depois que fecha, ela vira parte do Lancamento
// consolidado da fatura (ver lib/cartao.ts) e só pode ser corrigida por lá.
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatarMoeda, formatarData } from "../../../../../lib/financeiro";
import BotaoVoltar from "../../../../../components/BotaoVoltar";
import Badge, { tomEStatusFatura } from "../../../../../components/Badge";
import EditarCompraCartaoModal from "../../../../../components/EditarCompraCartaoModal";
import { useToast } from "../../../../../components/ToastProvider";
import { IconEdit, IconTrash } from "../../../../../components/Icons";

type CompraDetalhe = {
  id: string;
  descricao: string;
  valor: string;
  dataCompra: string;
  observacoes: string | null;
  categoria: { nome: string; icone: string } | null;
  cartao: { id: string; nome: string; icone: string };
  fatura: { id: string; status: "aberta" | "fechada" | "paga"; anoReferencia: number; mesReferencia: number };
};

export default function DetalheCompraCartaoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const showToast = useToast();

  const [compra, setCompra] = useState<CompraDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ajustando, setAjustando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [processando, setProcessando] = useState(false);

  function carregar() {
    setCarregando(true);
    fetch(`/api/compras-cartao/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: CompraDetalhe) => {
        setCompra(data);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }

  useEffect(carregar, [params.id]);

  async function salvarAjuste(valor: number, novaData: string) {
    if (!compra) return;
    const res = await fetch(`/api/compras-cartao/${compra.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor, dataCompra: novaData }),
    });
    if (res.ok) {
      showToast("Compra atualizada!");
      setAjustando(false);
      carregar();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Não foi possível atualizar a compra.", "erro");
    }
  }

  async function excluir() {
    if (!compra) return;
    setProcessando(true);
    const res = await fetch(`/api/compras-cartao/${compra.id}`, { method: "DELETE" });
    setProcessando(false);
    if (res.ok) {
      showToast("Compra excluída.");
      router.push(`/financeiro/cartoes/${compra.cartao.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Não foi possível excluir.", "erro");
    }
  }

  if (carregando) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro/contas" />
          <h1 className="text-xl font-bold">Detalhes da compra</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Carregando...</p>
      </div>
    );
  }

  if (!compra) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro/contas" />
          <h1 className="text-xl font-bold">Detalhes da compra</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Compra não encontrada.</p>
      </div>
    );
  }

  const { tom, texto } = tomEStatusFatura(compra.fatura.status);
  const editavel = compra.fatura.status === "aberta";

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href={`/financeiro/cartoes/${compra.cartao.id}`} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">Detalhes da compra</h1>
          <p className="text-sm text-muted mt-0.5 truncate">
            {compra.cartao.icone} {compra.cartao.nome}
          </p>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4 pb-4">
        <div className="card space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-14 h-14 rounded-md bg-background flex items-center justify-center text-2xl shrink-0">
              {compra.categoria?.icone || "🧾"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-snug line-clamp-2">{compra.descricao}</p>
              <p className="text-xs text-muted mt-0.5">{formatarData(compra.dataCompra)}</p>
            </div>
            <Badge tom={tom}>{texto}</Badge>
          </div>

          <p className="text-3xl font-extrabold" style={{ color: "var(--color-error)" }}>
            {formatarMoeda(compra.valor)}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-xs text-muted">Categoria</p>
              <p className="text-sm font-semibold truncate">{compra.categoria?.nome || "Sem categoria"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Cartão</p>
              <p className="text-sm font-semibold truncate">
                {compra.cartao.icone} {compra.cartao.nome}
              </p>
            </div>
          </div>

          {compra.observacoes && (
            <div className="pt-1">
              <p className="text-xs text-muted">Observações</p>
              <p className="text-sm">{compra.observacoes}</p>
            </div>
          )}
        </div>

        {editavel ? (
          confirmarExclusao ? (
            <div className="card space-y-3" style={{ background: "var(--color-error-subtle)" }}>
              <p className="text-sm font-semibold text-error">Excluir esta compra da fatura?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmarExclusao(false)} className="btn-outline-sm">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={excluir}
                  disabled={processando}
                  className="btn-outline-sm text-error"
                  style={{ borderColor: "var(--color-border-error)" }}
                >
                  {processando ? "Excluindo..." : "Confirmar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAjustando(true)} className="btn-chip" style={{ background: "var(--color-muted-surface)", color: "var(--color-foreground)" }}>
                <IconEdit size={14} /> Ajustar valor
              </button>
              <button type="button" onClick={() => setConfirmarExclusao(true)} className="btn-chip text-error" style={{ background: "var(--color-error-subtle)" }}>
                <IconTrash size={14} /> Excluir
              </button>
            </div>
          )
        ) : (
          <p className="text-xs text-muted text-center">
            A fatura desta compra já {compra.fatura.status === "paga" ? "foi paga" : "fechou"} e não pode mais ser alterada por
            aqui.
          </p>
        )}

        {editavel && (
          <button
            type="button"
            onClick={() => router.push(`/financeiro/novo?compraCartaoId=${compra.id}`)}
            className="btn-outline flex items-center justify-center gap-2"
          >
            <IconEdit size={16} /> Editar detalhes completos
          </button>
        )}
      </div>

      <EditarCompraCartaoModal aberto={ajustando} compra={compra} onFechar={() => setAjustando(false)} onSalvar={salvarAjuste} />
    </div>
  );
}
