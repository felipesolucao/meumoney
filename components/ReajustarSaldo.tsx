"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatarMoeda } from "../lib/financeiro";
import { useToast } from "./ToastProvider";
import styles from "./ReajustarSaldo.module.css";

export default function ReajustarSaldo({ conta, onFechar, onSalvo }: {
  conta: { id: string; nome: string; saldoAtual: number };
  onFechar: () => void; onSalvo: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const enviando = useRef(false);
  const [valor, setValor] = useState(Math.abs(conta.saldoAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const [negativo, setNegativo] = useState(conta.saldoAtual < 0);
  const [modo, setModo] = useState("transacao");
  const [avancado, setAvancado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const toast = useToast();
  const novoSaldo = Number(valor.replace(/\D/g, "")) / 100 * (negativo ? -1 : 1);
  const delta = Math.round((novoSaldo - conta.saldoAtual) * 100) / 100;

  useEffect(() => {
    const elemento = dialog.current;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    elemento?.showModal();
    document.body.style.overflow = "hidden";
    return () => { elemento?.close(); document.body.style.overflow = overflow; anterior?.focus(); };
  }, []);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (enviando.current) return;
    if (!Number.isFinite(novoSaldo) || Math.abs(novoSaldo) > 9999999999.99) { setErro("Informe um saldo válido."); return; }
    enviando.current = true;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/contas/${conta.id}/reajustar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novoSaldo, saldoEsperado: conta.saldoAtual, modo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível reajustar o saldo.");
      toast("Saldo reajustado!");
      onSalvo();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar. Verifique sua conexão.");
    } finally { enviando.current = false; setSalvando(false); }
  }

  return createPortal(
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="reajuste-titulo"
      onCancel={(event) => { event.preventDefault(); if (!enviando.current) onFechar(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !enviando.current) onFechar(); }}>
      <form onSubmit={salvar} className={styles.content}>
        <div className={styles.header}>
          <h2 id="reajuste-titulo">Reajustar saldo</h2>
          <button type="submit" className={styles.confirm} disabled={salvando || delta === 0} aria-label="Confirmar reajuste">✓</button>
        </div>
        <p className={styles.muted}>{conta.nome} · Atual: {formatarMoeda(conta.saldoAtual)}</p>
        <label htmlFor="novo-saldo" className={styles.label}>Novo saldo</label>
        <div className={styles.amount}>
          <span>R$ {negativo ? "−" : ""}</span>
          <input id="novo-saldo" inputMode="decimal" autoComplete="off" value={valor} disabled={salvando} maxLength={18}
            onChange={(event) => setValor((Number(event.target.value.replace(/\D/g, "")) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} />
          <button type="button" className={styles.sign} disabled={salvando} aria-label="Alternar saldo positivo ou negativo" aria-pressed={negativo} onClick={() => setNegativo(!negativo)}>±</button>
        </div>
        <p className={styles.explanation}>
          {delta === 0 ? "Informe o novo saldo da sua conta." : modo === "inicial" ? "Para ajustar seu saldo, será modificado o saldo inicial da conta." : `Para ajustar seu saldo, será criada uma ${delta > 0 ? "receita" : "despesa"} de ajuste.`}
        </p>
        <div className={styles.preview}>
          <span className={styles.icon} aria-hidden="true">⚒</span>
          <div><strong>{modo === "inicial" ? "Saldo inicial" : "Reajuste"}</strong><p className={styles.muted}>{new Date().toLocaleDateString("pt-BR")}</p></div>
          <strong className={styles.total}>{formatarMoeda(Math.abs(delta))}</strong>
        </div>
        <button type="button" className={styles.advanced} aria-expanded={avancado} aria-controls="opcoes-reajuste" onClick={() => setAvancado(!avancado)}>Opções avançadas {avancado ? "⌃" : "⌄"}</button>
        {avancado && <fieldset id="opcoes-reajuste" className={styles.options} disabled={salvando}>
          <legend className="sr-only">Forma de reajuste</legend>
          <label><input type="radio" name="modo" checked={modo === "transacao"} onChange={() => setModo("transacao")} />Criar transação de ajuste</label>
          <label><input type="radio" name="modo" checked={modo === "inicial"} onChange={() => setModo("inicial")} />Modificar saldo inicial</label>
        </fieldset>}
        {erro && <p role="alert" className="text-error text-sm">{erro}</p>}
        <div className={styles.actions}>
          <button type="button" className="btn-outline" disabled={salvando} onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={salvando || delta === 0}>{salvando ? "Salvando..." : "Salvar ajuste"}</button>
        </div>
      </form>
    </dialog>, document.body,
  );
}
