// ============================================================================
// PÁGINA: Contas a pagar (histórico de despesas)
// ----------------------------------------------------------------------------
// Por padrão mostra o mês atual (seletor de mês no topo, como no app de
// referência). A aba "Atrasadas" e "Todas" ignoram o filtro de mês, porque
// nesses casos faz mais sentido ver tudo, independente do período.
// ============================================================================
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatarMoeda } from "../../../lib/financeiro";
import LancamentosLista, { LancamentoItem } from "../../../components/LancamentosLista";
import BotaoVoltar from "../../../components/BotaoVoltar";
import MesSeletor from "../../../components/MesSeletor";
import { IconHistory } from "../../../components/Icons";

type Aba = "pendentes" | "atrasadas" | "pagas" | "todas";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function ContasAPagar() {
  const [aba, setAba] = useState<Aba>("pendentes");
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  // O filtro de mês só se aplica quando a aba não é "atrasadas"/"todas" —
  // essas duas fazem sentido olhar o histórico inteiro, não só um mês.
  const usaFiltroMes = aba === "pendentes" || aba === "pagas";

  useEffect(() => {
    setCarregando(true);
    let url = "/api/lancamentos?tipo=despesa";
    if (aba === "pendentes") url += "&status=pendente";
    else if (aba === "atrasadas") url += "&status=atrasado";
    else if (aba === "pagas") url += "&status=pago";

    if (usaFiltroMes) {
      const inicio = new Date(ano, mes, 1);
      const fim = new Date(ano, mes + 1, 0);
      url += `&de=${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-${pad(inicio.getDate())}`;
      url += `&ate=${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((data: LancamentoItem[]) => {
        // Mais recente primeiro, como no app de referência.
        const ordenado = [...data].sort(
          (a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime()
        );
        setLancamentos(ordenado);
        setCarregando(false);
      });
  }, [aba, ano, mes, usaFiltroMes]);

  const totalPendente = useMemo(
    () => lancamentos.filter((l) => l.status !== "pago").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos]
  );

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Contas a pagar</h1>
          <p className="text-muted text-sm">Histórico de despesas</p>
        </div>
        <Link href="/historico?entidade=Lancamento&voltar=/financeiro/pagar" className="icon-btn text-foreground">
          <IconHistory size={18} />
        </Link>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {usaFiltroMes && (
          <div className="card">
            <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
          </div>
        )}

        <div className="card" style={{ background: "var(--color-error-subtle)" }}>
          <p className="text-xs font-semibold tracking-wide text-error">TOTAL EM ABERTO</p>
          <p className="text-3xl font-extrabold mt-1 text-error">{formatarMoeda(totalPendente)}</p>
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
              className={aba === opt.valor ? "btn-primary !min-h-0 !py-2 !px-4 !w-auto text-sm" : "btn-outline !min-h-0 !py-2 !px-4 !w-auto text-sm whitespace-nowrap"}
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
