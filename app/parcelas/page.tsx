// ============================================================================
// PÁGINA: Parcelas (todas as parcelas, com filtros de período)
// ============================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatarMoeda, formatarData, statusDaParcela } from "../../lib/calculos";
import Badge, { tomEStatusParcela } from "../../components/Badge";
import { IconChevronRight } from "../../components/Icons";

type ParcelaComContrato = {
  id: string;
  numero: number;
  valor: string;
  vencimento: string;
  status: string;
  contrato: { id: string; codigo: string; cliente: { nome: string; telefone: string | null } };
};

type Aba = "hoje" | "amanha" | "atrasadas" | "por_data";

function isoHoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

function inicioFimMes() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

export default function Parcelas() {
  const [aba, setAba] = useState<Aba>("hoje");
  const [parcelas, setParcelas] = useState<ParcelaComContrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { inicio, fim } = inicioFimMes();
  const [de, setDe] = useState(inicio);
  const [ate, setAte] = useState(fim);

  useEffect(() => {
    setCarregando(true);
    let url = "/api/parcelas?";
    if (aba === "hoje") url += `de=${isoHoje()}&ate=${isoHoje()}`;
    else if (aba === "amanha") url += `de=${isoHoje(1)}&ate=${isoHoje(1)}`;
    else if (aba === "atrasadas") url += `status=atrasado`;
    else url += `de=${de}&ate=${ate}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setParcelas(data);
        setCarregando(false);
      });
  }, [aba, de, ate]);

  const totalAReceber = useMemo(
    () => parcelas.filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.valor), 0),
    [parcelas]
  );
  const pendentes = parcelas.filter((p) => p.status !== "pago");

  return (
    <div>
      <div className="header-gradient">
        <h1 className="text-2xl font-bold">Parcelas</h1>
        <p className="text-muted text-sm">{parcelas.length} no total</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { valor: "hoje", label: "Hoje" },
              { valor: "amanha", label: "Amanhã" },
              { valor: "atrasadas", label: "Atrasadas" },
              { valor: "por_data", label: "Por data" },
            ] as { valor: Aba; label: string }[]
          ).map((a) => (
            <button
              key={a.valor}
              onClick={() => setAba(a.valor)}
              className={`px-4 py-2 rounded-pill text-sm font-semibold whitespace-nowrap ${
                aba === a.valor ? "bg-primary text-white" : "bg-card border border-border text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {aba === "por_data" && (
          <div className="card flex items-center gap-2">
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="flex-1 outline-none" />
            <span className="text-muted"><IconChevronRight size={16} /></span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="flex-1 outline-none" />
          </div>
        )}

        <div className="card" style={{ background: "var(--color-primary-surface)" }}>
          <p className="text-xs font-semibold tracking-wide text-muted">TOTAL A RECEBER</p>
          <p className="text-3xl font-extrabold text-primary mt-1">{formatarMoeda(totalAReceber)}</p>
          <p className="text-sm text-muted mt-0.5">{pendentes.length} parcela(s)</p>
        </div>

        {carregando && <p className="text-center text-muted text-sm">Carregando...</p>}
        {!carregando && parcelas.length === 0 && (
          <div className="card text-center text-muted text-sm">Nenhuma parcela neste período.</div>
        )}

        <div className="space-y-3">
          {parcelas.map((p) => {
            const efetivo = statusDaParcela(new Date(p.vencimento), p.status === "pago");
            const { tom, texto } = tomEStatusParcela(efetivo);
            return (
              <div key={p.id} className="card flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-sm flex items-center justify-center font-bold text-white flex-shrink-0"
                  style={{ background: p.status === "pago" ? "var(--color-success)" : "var(--color-accent-strong)" }}
                >
                  {p.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold truncate">{p.contrato.cliente.nome}</p>
                    <Badge tom={tom}>{texto}</Badge>
                  </div>
                  <p className="text-sm text-muted">Vence {formatarData(p.vencimento)}</p>
                  <p className="text-primary font-bold">{formatarMoeda(p.valor)}</p>
                </div>
                <Link
                  href={`/contratos/${p.contrato.id}`}
                  className="w-9 h-9 rounded-pill bg-background flex items-center justify-center flex-shrink-0 text-muted"
                >
                  <IconChevronRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
