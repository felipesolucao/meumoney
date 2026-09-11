// ============================================================================
// COMPONENTE: Popup "Ajustar valor" de uma compra no cartão de crédito
// ----------------------------------------------------------------------------
// Mesma ideia do EditarLancamentoModal (financeiro) e do EditarParcelaModal
// (contratos): um jeito rápido de corrigir valor/data sem sair da tela.
//   - Fatura ainda ABERTA: edita valor e data da compra na hora.
//   - Fatura já FECHADA/PAGA: a compra virou uma linha fixa da fatura
//     consolidada (ver lib/cartao.ts) e não pode mais ser tocada por aqui —
//     mostra só um aviso, sem formulário.
// Para editar categoria/observações (campos que este popup não cobre), tem
// um link "Editar detalhes completos" que leva pra /financeiro/novo em modo
// de edição (?compraCartaoId=...).
// ============================================================================
"use client";

import Link from "next/link";
import { useState } from "react";
import { formatarMoeda } from "../lib/financeiro";
import CampoMoeda, { valorFormatadoParaNumero, numeroParaValorFormatado } from "./CampoMoeda";
import { IconClose } from "./Icons";

type CompraCartao = {
  id: string;
  descricao: string;
  valor: string;
  dataCompra: string;
  fatura: { status: "aberta" | "fechada" | "paga" };
};

export default function EditarCompraCartaoModal({
  aberto,
  compra,
  onFechar,
  onSalvar,
}: {
  aberto: boolean;
  compra: CompraCartao | null;
  onFechar: () => void;
  onSalvar: (valor: number, novaData: string) => Promise<void> | void;
}) {
  const [valorStr, setValorStr] = useState("");
  const [data, setData] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ultimoId, setUltimoId] = useState<string | null>(null);

  if (!aberto || !compra) return null;

  if (ultimoId !== compra.id) {
    setUltimoId(compra.id);
    setValorStr(numeroParaValorFormatado(Number(compra.valor)));
    setData(compra.dataCompra.slice(0, 10));
  }

  const editavel = compra.fatura.status === "aberta";

  async function salvar() {
    const valorNum = valorFormatadoParaNumero(valorStr);
    if (!valorNum || valorNum <= 0 || !data) return;
    setEnviando(true);
    await onSalvar(valorNum, data);
    setEnviando(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0" style={{ background: "rgb(var(--shadow-color) / 0.45)" }} onClick={onFechar} />

      <div className="relative w-full max-w-shell bg-card rounded-t-xl shadow-overlay flex flex-col animate-[slideUp_0.18s_ease-out]">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-pill bg-muted-surface" />

        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-lg font-bold truncate">{compra.descricao}</h2>
          <button type="button" onClick={onFechar} className="icon-btn flex-shrink-0" aria-label="Fechar">
            <IconClose size={18} />
          </button>
        </div>

        <div className="px-5 pb-[calc(1.5rem+var(--shell-bottom-space))] space-y-4">
          {!editavel ? (
            <div className="card !py-3" style={{ background: "var(--color-warning-subtle)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
                {compra.fatura.status === "paga" ? "Fatura já paga" : "Fatura já fechada"}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Valor lançado: {formatarMoeda(compra.valor)}. Esta compra já entrou no total da fatura e não pode mais ser
                ajustada por aqui — corrija diretamente o lançamento da fatura em "Contas a pagar" se precisar.
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR</p>
                <CampoMoeda value={valorStr} onChange={setValorStr} />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted mb-2">DATA DA COMPRA</p>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="form-input form-date-input" />
              </div>
              <button type="button" onClick={salvar} disabled={enviando} className="btn-primary-sm w-full">
                {enviando ? "Salvando..." : "Salvar alterações"}
              </button>
            </>
          )}

          <Link href={`/financeiro/novo?compraCartaoId=${compra.id}`} onClick={onFechar} className="block text-center text-primary text-sm font-semibold">
            Editar detalhes completos
          </Link>
        </div>
      </div>
    </div>
  );
}
