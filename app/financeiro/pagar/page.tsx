// ============================================================================
// PÁGINA: Contas a pagar (histórico de despesas)
// ============================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatarMoeda } from "../../../lib/financeiro";
import LancamentosLista, { LancamentoItem } from "../../../components/LancamentosLista";
import BotaoVoltar from "../../../components/BotaoVoltar";

type Aba = "pendentes" | "atrasadas" | "pagas" | "todas";

export default function ContasAPagar() {
  const [aba, setAba] = useState<Aba>("pendentes");
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    let url = "/api/lancamentos?tipo=despesa";
    if (aba === "pendentes") url += "&status=pendente";
    else if (aba === "atrasadas") url += "&status=atrasado";
    else if (aba === "pagas") url += "&status=pago";

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setLancamentos(data);
        setCarregando(false);
      });
  }, [aba]);

  const totalPendente = useMemo(
    () => lancamentos.filter((l) => l.status !== "pago").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos]
  );

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro" />
        <div>
          <h1 className="text-2xl font-bold">Contas a pagar</h1>
          <p className="text-muted text-sm">Histórico de despesas</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <div className="card" style={{ background: "#FBE4E2" }}>
          <p className="text-xs font-semibold tracking-wide text-danger">TOTAL EM ABERTO</p>
          <p className="text-3xl font-extrabold mt-1 text-danger">{formatarMoeda(totalPendente)}</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { valor: "pendentes", label: "Pendentes" },
              { valor: "atrasadas", label: "Atrasadas" },
              { valor: "pagas", label: "Pagas" },
              { valor: "todas", label: "Todas" },
            ] as { valor: Aba; label: string }[]
          ).map((opt) => (
            <button
              key={opt.valor}
              onClick={() => setAba(opt.valor)}
              className={aba === opt.valor ? "btn-primary !py-2 !px-4 !w-auto text-sm" : "btn-outline !py-2 !px-4 !w-auto text-sm whitespace-nowrap"}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : (
          <LancamentosLista lancamentos={lancamentos} />
        )}
      </div>
    </div>
  );
}
