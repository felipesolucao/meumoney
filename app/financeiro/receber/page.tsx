// ============================================================================
// PÁGINA: Contas a receber (histórico de receitas)
// ----------------------------------------------------------------------------
// Espelha app/financeiro/pagar/page.tsx, trocando tipo=despesa por tipo=receita
// e os rótulos das abas ("Recebidas" em vez de "Pagas").
//
// Aceita ?aba=pendentes|atrasadas|recebidas|todas na URL, para permitir que
// outras telas (ex: o bloco "RECEITAS" do card de balanço em /financeiro)
// já abram direto na aba certa, em vez de sempre cair em "Pendentes".
//
// useSearchParams() exige um <Suspense> ao redor quando a página é
// pré-renderizada no build (mesmo motivo de app/historico/page.tsx), por
// isso a lógica fica num componente filho e a exportação padrão só monta
// o Suspense em volta dele.
// ============================================================================
"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatarMoeda } from "../../../lib/financeiro";
import LancamentosLista, { LancamentoItem } from "../../../components/LancamentosLista";
import BotaoVoltar from "../../../components/BotaoVoltar";
import MesSeletor from "../../../components/MesSeletor";
import { IconHistory } from "../../../components/Icons";

type Aba = "pendentes" | "atrasadas" | "recebidas" | "todas";
const ABAS_VALIDAS: Aba[] = ["pendentes", "atrasadas", "recebidas", "todas"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ContasAReceberConteudo() {
  const params = useSearchParams();
  const abaInicial = ABAS_VALIDAS.includes(params.get("aba") as Aba) ? (params.get("aba") as Aba) : "pendentes";

  const [aba, setAba] = useState<Aba>(abaInicial);
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  const usaFiltroMes = aba === "pendentes" || aba === "recebidas";

  useEffect(() => {
    setCarregando(true);
    let url = "/api/lancamentos?tipo=receita";
    if (aba === "pendentes") url += "&status=pendente";
    else if (aba === "atrasadas") url += "&status=atrasado";
    else if (aba === "recebidas") url += "&status=pago";

    if (usaFiltroMes) {
      const inicio = new Date(ano, mes, 1);
      const fim = new Date(ano, mes + 1, 0);
      url += `&de=${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-${pad(inicio.getDate())}`;
      url += `&ate=${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((data: LancamentoItem[]) => {
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
          <h1 className="text-2xl font-bold">Contas a receber</h1>
          <p className="text-muted text-sm">Histórico de receitas</p>
        </div>
        <Link href="/historico?entidade=Lancamento&voltar=/financeiro/receber" className="icon-btn text-foreground">
          <IconHistory size={18} />
        </Link>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {usaFiltroMes && (
          <div className="card">
            <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
          </div>
        )}

        <div className="card" style={{ background: "var(--color-primary-surface)" }}>
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
              type="button"
              onClick={() => setAba(opt.valor)}
              className={`chip-toggle ${aba === opt.valor ? "chip-toggle-ativo" : ""}`}
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

export default function ContasAReceber() {
  return (
    <Suspense
      fallback={
        <div>
          <div className="header-gradient">
            <h1 className="text-2xl font-bold">Contas a receber</h1>
          </div>
          <p className="text-center text-muted text-sm py-10">Carregando...</p>
        </div>
      }
    >
      <ContasAReceberConteudo />
    </Suspense>
  );
}
