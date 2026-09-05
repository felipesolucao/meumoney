// ============================================================================
// PÁGINA: Contratos (lista com abas de status)
// ============================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatarMoeda, formatarData, statusDoContrato } from "@/lib/calculos";
import Badge, { tomEStatusContrato } from "@/components/Badge";

type Contrato = {
  id: string;
  codigo: string;
  valorTotal: string;
  numeroParcelas: number;
  status: string;
  jurosAoMes: string;
  cliente: { nome: string };
  parcelas: { status: string; vencimento: string }[];
};

const ABAS = [
  { valor: "todos", label: "Todos" },
  { valor: "em_dia", label: "Em dia" },
  { valor: "atrasado", label: "Atrasados" },
  { valor: "quitado", label: "Quitados" },
];

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [aba, setAba] = useState("todos");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/contratos")
      .then((r) => r.json())
      .then((data) => {
        setContratos(data);
        setCarregando(false);
      });
  }, []);

  const filtrados = useMemo(() => {
    return contratos.filter((c) => {
      const statusEfetivo = statusDoContrato(c.parcelas.map((p) => ({ vencimento: p.vencimento, status: p.status })));
      const passaAba = aba === "todos" || statusEfetivo === aba;
      const passaBusca = c.cliente.nome.toLowerCase().includes(busca.toLowerCase());
      return passaAba && passaBusca;
    });
  }, [contratos, aba, busca]);

  return (
    <div>
      <div className="header-gradient">
        <h1 className="text-2xl font-bold">Contratos</h1>
        <p className="text-muted text-sm">{contratos.length} contrato(s)</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <Link href="/contratos/novo" className="btn-primary">
          + Novo contrato
        </Link>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome do cliente..."
          className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {ABAS.map((a) => (
            <button
              key={a.valor}
              onClick={() => setAba(a.valor)}
              className={`px-4 py-2 rounded-pill text-sm font-semibold whitespace-nowrap ${
                aba === a.valor ? "bg-primary text-white" : "bg-white border border-gray-200 text-ink"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {carregando && <p className="text-center text-muted text-sm">Carregando...</p>}
        {!carregando && filtrados.length === 0 && (
          <div className="card text-center text-muted text-sm">Nenhum contrato encontrado.</div>
        )}

        <div className="space-y-3">
          {filtrados.map((c) => {
            const pagas = c.parcelas.filter((p) => p.status === "pago").length;
            const proxima = c.parcelas.find((p) => p.status !== "pago");
            const statusEfetivo = statusDoContrato(c.parcelas.map((p) => ({ vencimento: p.vencimento, status: p.status })));
            const statusInfo = tomEStatusContrato(statusEfetivo);
            return (
              <Link key={c.id} href={`/contratos/${c.id}`} className="card block">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{c.cliente.nome}</p>
                  <Badge tom={statusInfo.tom}>{statusInfo.texto}</Badge>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {c.codigo} · {Number(c.jurosAoMes)}% a.m.
                </p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-2xl font-extrabold text-primary">{formatarMoeda(c.valorTotal)}</p>
                  <p className="text-sm text-muted">{c.numeroParcelas}x</p>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${c.parcelas.length ? (pagas / c.parcelas.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-muted">
                  <span>
                    {pagas} de {c.parcelas.length} pagas
                  </span>
                  {proxima && <span>Próx: {formatarData(proxima.vencimento)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
