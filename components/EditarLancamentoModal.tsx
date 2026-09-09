// ============================================================================
// COMPONENTE: Popup "Editar lançamento" (financeiro)
// ----------------------------------------------------------------------------
// Mesma ideia do EditarParcelaModal usado nos contratos:
//   - Lançamento ainda pendente: edita valor e/ou vencimento rapidamente.
//   - Lançamento já pago: mostra a data do pagamento e o botão "Estornar".
// Para editar categoria/conta/observações (campos que este popup não cobre),
// tem um link "Editar detalhes completos" que leva pra tela cheia de sempre
// (/financeiro/[id]/editar).
// ============================================================================
"use client";

import Link from "next/link";
import { useState } from "react";
import { formatarMoeda } from "../lib/financeiro";
import { formatarData } from "../lib/calculos";
import CampoMoeda, { valorFormatadoParaNumero, numeroParaValorFormatado } from "./CampoMoeda";
import { IconClose, IconUndo } from "./Icons";

type Lancamento = {
  id: string;
  descricao: string;
  valor: string;
  valorPago?: string | null;
  dataVencimento: string;
  dataPagamento?: string | null;
  status: string;
};

export default function EditarLancamentoModal({
  aberto,
  lancamento,
  onFechar,
  onSalvar,
  onEstornar,
}: {
  aberto: boolean;
  lancamento: Lancamento | null;
  onFechar: () => void;
  onSalvar: (valor: number, novoVencimento: string) => Promise<void> | void;
  onEstornar: () => Promise<void> | void;
}) {
  const [valorStr, setValorStr] = useState("");
  const [data, setData] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmandoEstorno, setConfirmandoEstorno] = useState(false);
  const [ultimoId, setUltimoId] = useState<string | null>(null);

  if (!aberto || !lancamento) return null;

  if (ultimoId !== lancamento.id) {
    setUltimoId(lancamento.id);
    setValorStr(numeroParaValorFormatado(Number(lancamento.valor)));
    setData(lancamento.dataVencimento.slice(0, 10));
    setConfirmandoEstorno(false);
  }

  const pago = lancamento.status === "pago";

  async function salvar() {
    const valorNum = valorFormatadoParaNumero(valorStr);
    if (!valorNum || valorNum <= 0 || !data) return;
    setEnviando(true);
    await onSalvar(valorNum, data);
    setEnviando(false);
  }

  async function estornar() {
    setEnviando(true);
    await onEstornar();
    setEnviando(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0" style={{ background: "rgb(var(--shadow-color) / 0.45)" }} onClick={onFechar} />

      <div className="relative w-full max-w-shell bg-card rounded-t-xl shadow-overlay flex flex-col animate-[slideUp_0.18s_ease-out]">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-pill bg-muted-surface" />

        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-lg font-bold truncate">{lancamento.descricao}</h2>
          <button type="button" onClick={onFechar} className="icon-btn flex-shrink-0" aria-label="Fechar">
            <IconClose size={18} />
          </button>
        </div>

        <div className="px-5 pb-[calc(1.5rem+var(--shell-bottom-space))] space-y-4">
          {pago ? (
            <>
              <div className="card !py-3" style={{ background: "var(--color-success-subtle)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--color-success)" }}>
                  Pago em {lancamento.dataPagamento ? formatarData(lancamento.dataPagamento) : "—"}
                </p>
                <p className="text-xs text-muted mt-0.5">Valor: {formatarMoeda(lancamento.valorPago ?? lancamento.valor)}</p>
              </div>

              {confirmandoEstorno ? (
                <div className="card space-y-3" style={{ background: "var(--color-error-subtle)" }}>
                  <p className="text-sm font-semibold text-error">Estornar este pagamento? Volta a ficar pendente.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmandoEstorno(false)} className="btn-outline-sm">
                      Cancelar
                    </button>
                    <button type="button" onClick={estornar} disabled={enviando} className="btn-outline-sm text-error" style={{ borderColor: "var(--color-border-error)" }}>
                      {enviando ? "Estornando..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmandoEstorno(true)} className="btn-outline-sm w-full text-error" style={{ borderColor: "var(--color-border-error)" }}>
                  <IconUndo size={16} /> Estornar pagamento
                </button>
              )}
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR</p>
                <CampoMoeda value={valorStr} onChange={setValorStr} />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted mb-2">VENCIMENTO</p>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="form-input form-date-input" />
              </div>
              <button type="button" onClick={salvar} disabled={enviando} className="btn-primary-sm w-full">
                {enviando ? "Salvando..." : "Salvar alterações"}
              </button>
            </>
          )}

          <Link href={`/financeiro/${lancamento.id}/editar`} onClick={onFechar} className="block text-center text-primary text-sm font-semibold">
            Editar detalhes completos
          </Link>
        </div>
      </div>
    </div>
  );
}
