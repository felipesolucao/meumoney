// ============================================================================
// PÁGINA: Contas a receber (histórico de receitas)
// ============================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatarMoeda } from "../../../lib/financeiro";
import LancamentosLista, { LancamentoItem } from "../../../components/LancamentosLista";
import BotaoVoltar from "../../../components/BotaoVoltar";

type Aba = "pendentes" | "atrasadas" | "recebidas" | "todas";

export default function ContasAReceber() {
  const [aba, setAba] = useState<Aba>("pendentes");
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    let url = "/api/lancamentos?tipo=receita";
    if (aba === "pendentes") url += "&status=pendente";
    else if (aba === "atrasadas") url += "&status=atrasado";
    else if (aba === "recebidas") url += "&status=pago";

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
          <h1 className="text-2xl font-bold">Contas a receber</h1>
          <p className="text-muted text-sm">Histórico de receitas</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <div className="card" style={{ background: "#eafaf0" }}>
          <p className="text-xs font-semibold tracking-wide text-primary">TOTAL A RECEBER</p>
          <p className="text-3xl font-extrabold mt-1 text-primary">{formatarMoeda(totalPendente)}</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { valor: "pendentes", label: "Pendentes" },
              { valor: "atrasadas", label: "Atrasadas" },
              { valor: "recebidas", label: "Recebidas" },
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
