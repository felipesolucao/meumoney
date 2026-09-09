// ============================================================================
// COMPONENTE: Popup "Editar parcela"
// ----------------------------------------------------------------------------
// Abre ao tocar no ícone de lápis numa parcela (ver ParcelasLista).
//   - Parcela ainda não paga: edita valor e/ou vencimento (substitui os
//     antigos window.prompt() por um formulário de verdade).
//   - Parcela já paga: mostra a data do pagamento e o botão "Estornar
//     pagamento" — antes esse botão ficava solto no card; agora só aparece
//     aqui dentro, pra não competir visualmente com Cobrar/Renegociar/Pagar.
// ============================================================================
"use client";

import { useState } from "react";
import { formatarMoeda, formatarData } from "../lib/calculos";
import CampoMoeda, { valorFormatadoParaNumero, numeroParaValorFormatado } from "./CampoMoeda";
import { IconClose, IconUndo } from "./Icons";

type Parcela = {
  id: string;
  numero: number;
  valor: string;
  valorPago?: string | null;
  vencimento: string;
  status: string;
  pagoEm?: string | null;
};

export default function EditarParcelaModal({
  aberto,
  parcela,
  onFechar,
  onSalvar,
  onEstornar,
}: {
  aberto: boolean;
  parcela: Parcela | null;
  onFechar: () => void;
  onSalvar: (valor: number, novoVencimento: string) => Promise<void> | void;
  onEstornar: () => Promise<void> | void;
}) {
  const [valorStr, setValorStr] = useState("");
  const [data, setData] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmandoEstorno, setConfirmandoEstorno] = useState(false);
  const [ultimaParcelaId, setUltimaParcelaId] = useState<string | null>(null);

  if (!aberto || !parcela) return null;

  // Mesma ideia do ReceberPagamentoModal: sincroniza os campos com a
  // parcela atual no primeiro render dela, sem useEffect.
  if (ultimaParcelaId !== parcela.id) {
    setUltimaParcelaId(parcela.id);
    setValorStr(numeroParaValorFormatado(Number(parcela.valor)));
    setData(parcela.vencimento.slice(0, 10));
    setConfirmandoEstorno(false);
  }

  const paga = parcela.status === "pago";

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
          <h2 className="text-lg font-bold">Parcela {parcela.numero}</h2>
          <button type="button" onClick={onFechar} className="icon-btn" aria-label="Fechar">
            <IconClose size={18} />
          </button>
        </div>

        <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-4">
          {paga ? (
            <>
              <div className="card !py-3" style={{ background: "var(--color-success-subtle)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--color-success)" }}>
                  Paga em {parcela.pagoEm ? formatarData(parcela.pagoEm) : "—"}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Valor recebido: {formatarMoeda(parcela.valorPago ?? parcela.valor)}
                </p>
              </div>

              {confirmandoEstorno ? (
                <div className="card space-y-3" style={{ background: "var(--color-error-subtle)" }}>
                  <p className="text-sm font-semibold text-error">Estornar este pagamento? A parcela volta a ficar em aberto.</p>
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
                <p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR DA PARCELA</p>
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
        </div>
      </div>
    </div>
  );
}
