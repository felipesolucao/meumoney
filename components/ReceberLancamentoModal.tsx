// ============================================================================
// COMPONENTE: Popup "Receber pagamento" para um Lancamento (financeiro)
// ----------------------------------------------------------------------------
// Mesma ideia do ReceberPagamentoModal usado nas parcelas de contrato —
// define a data do recebimento/pagamento e o valor, com suporte a pagamento
// parcial (ver app/api/lancamentos/[id]/route.ts). Usado em Contas a
// pagar/receber (ver components/LancamentosLista.tsx).
// ============================================================================
"use client";

import { useState } from "react";
import { formatarMoeda } from "../lib/financeiro";
import { formatarData } from "../lib/calculos";
import CampoMoeda, { valorFormatadoParaNumero, numeroParaValorFormatado } from "./CampoMoeda";
import { IconCheck, IconClose } from "./Icons";

type Lancamento = {
  id: string;
  descricao: string;
  valor: string;
  valorPago?: string | null;
  tipo: "receita" | "despesa";
  dataVencimento: string;
};

export default function ReceberLancamentoModal({
  aberto,
  lancamento,
  onFechar,
  onConfirmar,
}: {
  aberto: boolean;
  lancamento: Lancamento | null;
  onFechar: () => void;
  onConfirmar: (dataRecebimento: string, valorRecebido: number) => Promise<void> | void;
}) {
  const [valorStr, setValorStr] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [enviando, setEnviando] = useState(false);
  const [ultimoId, setUltimoId] = useState<string | null>(null);

  if (!aberto || !lancamento) return null;

  const ehReceita = lancamento.tipo === "receita";
  const jaRecebido = Number(lancamento.valorPago ?? 0);
  const restante = Number(lancamento.valor) - jaRecebido;

  if (ultimoId !== lancamento.id) {
    setUltimoId(lancamento.id);
    setValorStr(numeroParaValorFormatado(restante));
    setData(new Date().toISOString().slice(0, 10));
  }

  const valorRecebido = valorFormatadoParaNumero(valorStr);
  const parcial = valorRecebido > 0 && valorRecebido < restante;

  async function confirmar() {
    if (!valorRecebido || valorRecebido <= 0) return;
    setEnviando(true);
    await onConfirmar(data, valorRecebido);
    setEnviando(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0" style={{ background: "rgb(var(--shadow-color) / 0.45)" }} onClick={onFechar} />

      <div className="relative w-full max-w-shell max-h-[90vh] bg-card rounded-t-xl shadow-overlay flex flex-col animate-[slideUp_0.18s_ease-out]">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-pill bg-muted-surface" />

        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-lg font-bold">{ehReceita ? "Receber pagamento" : "Pagar"}</h2>
          <button type="button" onClick={onFechar} className="icon-btn" aria-label="Fechar">
            <IconClose size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-[calc(1.5rem+var(--shell-bottom-space))] space-y-4">
          <div className="rounded-lg p-5" style={{ background: "var(--gradient-surface)" }}>
            <p className="text-xs font-semibold tracking-wide text-muted">{ehReceita ? "TOTAL A RECEBER" : "TOTAL A PAGAR"}</p>
            <p className="text-4xl font-extrabold text-primary mt-1">{formatarMoeda(restante)}</p>
            <p className="text-sm text-muted mt-2">{lancamento.descricao}</p>
            <p className="text-sm text-muted">Vencimento {formatarData(lancamento.dataVencimento)}</p>
            {jaRecebido > 0 && (
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-primary)" }}>
                {formatarMoeda(jaRecebido)} já {ehReceita ? "recebido" : "pago"} antes
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">{ehReceita ? "VALOR RECEBIDO" : "VALOR PAGO"}</p>
            <CampoMoeda value={valorStr} onChange={setValorStr} autoFocus />
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">{ehReceita ? "DATA DO RECEBIMENTO" : "DATA DO PAGAMENTO"}</p>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="form-input form-date-input" />
          </div>

          {parcial && (
            <div className="card !py-3" style={{ background: "var(--color-warning-subtle)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
                Pagamento parcial
              </p>
              <p className="text-xs text-muted mt-0.5">
                Ainda vai faltar {formatarMoeda(restante - valorRecebido)} — continua em aberto até completar o valor.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={confirmar}
            disabled={enviando || !valorRecebido || valorRecebido <= 0}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <IconCheck size={18} /> {enviando ? "Confirmando..." : `Confirmar ${ehReceita ? "recebimento" : "pagamento"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
