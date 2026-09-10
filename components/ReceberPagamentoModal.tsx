// ============================================================================
// COMPONENTE: Popup "Receber pagamento"
// ----------------------------------------------------------------------------
// Abre ao tocar em "Pagar" numa parcela (ver ParcelasLista). Deixa escolher
// a data do recebimento (SeletorDataUnica, mesmo design do filtro de período
// da Início), o valor recebido — se vier menor que o valor da parcela, o
// backend registra como "pagamento parcial" (ver app/api/parcelas/[id]/
// route.ts): a parcela continua em aberto, só que com o valor já recebido
// acumulado, e o restante segue pendente — e a conta que recebe o valor
// (dropdown "CONTA DE DESTINO"), que soma no saldo dela (ver
// app/api/financeiro/contas-resumo/route.ts).
// ============================================================================
"use client";

import { useState } from "react";
import { formatarMoeda, formatarData } from "../lib/calculos";
import CampoMoeda, { valorFormatadoParaNumero, numeroParaValorFormatado } from "./CampoMoeda";
import SeletorDataUnica from "./SeletorDataUnica";
import { IconCheck, IconClose } from "./Icons";

type Parcela = {
  id: string;
  numero: number;
  valor: string;
  valorPago?: string | null;
  vencimento: string;
};

type Conta = { id: string; nome: string; icone: string };

export default function ReceberPagamentoModal({
  aberto,
  parcela,
  clienteNome,
  codigoContrato,
  contas,
  contaIdPadrao,
  onFechar,
  onConfirmar,
}: {
  aberto: boolean;
  parcela: Parcela | null;
  clienteNome: string;
  codigoContrato: string;
  contas: Conta[];
  contaIdPadrao?: string | null;
  onFechar: () => void;
  onConfirmar: (dataRecebimento: string, valorRecebido: number, contaId: string) => Promise<void> | void;
}) {
  const [valorStr, setValorStr] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ultimaParcelaId, setUltimaParcelaId] = useState<string | null>(null);

  if (!aberto || !parcela) return null;

  const jaRecebido = Number(parcela.valorPago ?? 0);
  const restante = Number(parcela.valor) - jaRecebido;

  // Reabre sempre pré-preenchido com o valor restante — como o componente
  // não desmonta entre uma parcela e outra, sincroniza no primeiro render
  // de cada parcela nova em vez de usar useEffect (evita um piscar de "0,00").
  if (ultimaParcelaId !== parcela.id) {
    setUltimaParcelaId(parcela.id);
    setValorStr(numeroParaValorFormatado(restante));
    setData(new Date().toISOString().slice(0, 10));
    setContaId(contaIdPadrao || contas[0]?.id || "");
  }

  const valorRecebido = valorFormatadoParaNumero(valorStr);
  const parcial = valorRecebido > 0 && valorRecebido < restante;

  async function confirmar() {
    if (!valorRecebido || valorRecebido <= 0) return;
    setEnviando(true);
    await onConfirmar(data, valorRecebido, contaId);
    setEnviando(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0" style={{ background: "rgb(var(--shadow-color) / 0.45)" }} onClick={onFechar} />

      <div className="relative w-full max-w-shell max-h-[90vh] bg-card rounded-t-xl shadow-overlay flex flex-col animate-[slideUp_0.18s_ease-out]">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-pill bg-muted-surface" />

        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-lg font-bold">Receber pagamento</h2>
          <button type="button" onClick={onFechar} className="icon-btn" aria-label="Fechar">
            <IconClose size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-[calc(1.5rem+var(--shell-bottom-space))] space-y-4">
          <div className="rounded-lg p-5" style={{ background: "var(--gradient-surface)" }}>
            <p className="text-xs font-semibold tracking-wide text-muted">TOTAL A RECEBER</p>
            <p className="text-4xl font-extrabold text-primary mt-1">{formatarMoeda(restante)}</p>
            <p className="text-sm text-muted mt-2">
              {clienteNome} · Parcela {parcela.numero} · Contrato {codigoContrato}
            </p>
            <p className="text-sm text-muted">Vencimento {formatarData(parcela.vencimento)}</p>
            {jaRecebido > 0 && (
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-primary)" }}>
                {formatarMoeda(jaRecebido)} já recebido antes
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR RECEBIDO</p>
            <CampoMoeda value={valorStr} onChange={setValorStr} autoFocus />
          </div>

          <SeletorDataUnica label="DATA DO RECEBIMENTO" valor={data} onSelecionar={setData} />

          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">CONTA DE DESTINO</p>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent px-3 py-3 outline-none focus:border-primary"
            >
              {contas.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.icone} {conta.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1.5">O valor recebido soma no saldo desta conta.</p>
          </div>

          {parcial && (
            <div className="card !py-3" style={{ background: "var(--color-warning-subtle)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
                Pagamento parcial
              </p>
              <p className="text-xs text-muted mt-0.5">
                Ainda vai faltar {formatarMoeda(restante - valorRecebido)} — a parcela continua em aberto até completar o valor.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={confirmar}
            disabled={enviando || !valorRecebido || valorRecebido <= 0 || !contaId}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <IconCheck size={18} /> {enviando ? "Confirmando..." : "Confirmar recebimento"}
          </button>
        </div>
      </div>
    </div>
  );
}
