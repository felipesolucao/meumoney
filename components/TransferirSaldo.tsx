"use client";

import { useMemo, useState } from "react";
import PopupCentral from "./PopupCentral";
import CampoMoeda, { valorFormatadoParaNumero } from "./CampoMoeda";
import { formatarMoeda } from "../lib/financeiro";

type Conta = { id: string; nome: string; icone: string; saldoAtual: number };

export default function TransferirSaldo({ contas, onFechar, onSalvo }: { contas: Conta[]; onFechar: () => void; onSalvo: () => void }) {
  const [origemId, setOrigemId] = useState(contas[0]?.id ?? "");
  const [destinoId, setDestinoId] = useState(contas.find((c) => c.id !== contas[0]?.id)?.id ?? "");
  const [valor, setValor] = useState("");
  const [criarHistorico, setCriarHistorico] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const origem = useMemo(() => contas.find((c) => c.id === origemId), [contas, origemId]);

  async function transferir(event: React.FormEvent) {
    event.preventDefault();
    const valorNumerico = valorFormatadoParaNumero(valor);
    if (!valorNumerico || origemId === destinoId) return setErro("Escolha contas diferentes e informe o valor.");
    setSalvando(true); setErro("");
    try {
      const res = await fetch("/api/contas/transferir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contaOrigemId: origemId, contaDestinoId: destinoId, valor: valorNumerico, criarHistorico }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSalvo();
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível transferir."); }
    finally { setSalvando(false); }
  }

  return <PopupCentral titulo="Transferir saldo" onFechar={onFechar}>
    <form onSubmit={transferir} className="space-y-4">
      <label className="block text-sm font-semibold">Conta de origem
        <select className="w-full rounded-md border border-border bg-card px-3 py-3 mt-1" value={origemId} onChange={(e) => { setOrigemId(e.target.value); if (e.target.value === destinoId) setDestinoId(contas.find((c) => c.id !== e.target.value)?.id ?? ""); }} disabled={salvando}>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nome} — {formatarMoeda(c.saldoAtual)}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Conta de destino
        <select className="w-full rounded-md border border-border bg-card px-3 py-3 mt-1" value={destinoId} onChange={(e) => setDestinoId(e.target.value)} disabled={salvando}>
          {contas.filter((c) => c.id !== origemId).map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
        </select>
      </label>
      <div><p className="text-sm font-semibold mb-1">Valor</p><CampoMoeda value={valor} onChange={setValor} /></div>
      <div className="card !p-3">
        <p className="font-semibold text-sm">Criar histórico da movimentação?</p>
        <p className="text-xs text-muted mt-1">Se sim, a saída e a entrada aparecerão nos extratos e nas movimentações recentes.</p>
        <div className="flex gap-4 mt-3">
          <label className="flex items-center gap-2"><input type="radio" checked={criarHistorico} onChange={() => setCriarHistorico(true)} /> Sim</label>
          <label className="flex items-center gap-2"><input type="radio" checked={!criarHistorico} onChange={() => setCriarHistorico(false)} /> Não</label>
        </div>
      </div>
      {origem && valorFormatadoParaNumero(valor) > origem.saldoAtual && <p className="text-sm text-error">A conta de origem ficará com saldo negativo.</p>}
      {erro && <p role="alert" className="text-error text-sm">{erro}</p>}
      <div className="flex gap-3"><button type="button" className="btn-outline flex-1" onClick={onFechar} disabled={salvando}>Cancelar</button><button type="submit" className="btn-primary flex-1" disabled={salvando || !destinoId || valorFormatadoParaNumero(valor) <= 0}>{salvando ? "Transferindo..." : "Transferir"}</button></div>
    </form>
  </PopupCentral>;
}
