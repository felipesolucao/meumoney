// ============================================================================
// PÁGINA: Contas a pagar (histórico de despesas)
// ----------------------------------------------------------------------------
// Por padrão mostra o mês atual (seletor de mês no topo, como no app de
// referência). A aba "Atrasadas" e "Todas" ignoram o filtro de mês, porque
// nesses casos faz mais sentido ver tudo, independente do período.
//
// Aceita ?aba=pendentes|atrasadas|pagas|todas na URL, para permitir que
// outras telas (ex: o bloco "DESPESAS" do card de balanço em /financeiro)
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

type Aba = "pendentes" | "atrasadas" | "pagas" | "todas";
const ABAS_VALIDAS: Aba[] = ["pendentes", "atrasadas", "pagas", "todas"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ContasAPagarConteudo() {
  const params = useSearchParams();
  const abaInicial = ABAS_VALIDAS.includes(params.get("aba") as Aba) ? (params.get("aba") as Aba) : "pendentes";

  const [aba, setAba] = useState<Aba>(abaInicial);
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

  // ----------------------------------------------------------------------------
  // BUG CORRIGIDO: o total sempre filtrava por "status !== pago" antes de
  // somar. Isso funciona nas abas Pendentes/Atrasadas/Todas, mas na aba
  // "Pagas" a lista inteira já é status=pago (veio filtrada da API) — então
  // esse filtro zerava tudo e o card mostrava R$ 0,00 mesmo com lançamentos
  // na lista.
  //
  // Correção: a soma passa a depender da aba selecionada, e o rótulo do card
  // muda junto pra continuar fazendo sentido com o número mostrado:
  //   - "atrasadas" -> soma tudo (já é só atrasado) / rótulo "TOTAL EM ATRASO"
  //   - "pagas"     -> soma só o que está pago       / rótulo "TOTAL PAGO"
  //   - demais      -> soma só o que ainda não foi pago (comportamento de
  //                    antes) / rótulo "TOTAL EM ABERTO"
  // ----------------------------------------------------------------------------
  const totalExibido = useMemo(() => {
    if (aba === "pagas") {
      return lancamentos.filter((l) => l.status === "pago").reduce((s, l) => s + Number(l.valor), 0);
    }
    if (aba === "atrasadas") {
      return lancamentos.reduce((s, l) => s + Number(l.valor), 0);
    }
    return lancamentos.filter((l) => l.status !== "pago").reduce((s, l) => s + Number(l.valor), 0);
  }, [lancamentos, aba]);

  const rotuloTotal = aba === "pagas" ? "TOTAL PAGO" : aba === "atrasadas" ? "TOTAL EM ATRASO" : "TOTAL EM ABERTO";

  // Instantâneo: chamado pelo LancamentosLista assim que o usuário marca um
  // lançamento como pago/reaberto e a API confirma. Antes disso o item só
  // sumia da tela quando a página recarregava (troca de mês/aba ou F5), o que
  // dava a impressão de que a ação não tinha funcionado.
  function aoAlterarStatusLocal(id: string, novoStatus: "pendente" | "pago") {
    setLancamentos((atual) => {
      // Nas abas filtradas por status, o item que mudou não pertence mais a
      // esta lista -> some na hora. Na aba "Todas" (sem filtro de status) ele
      // continua na lista, só com o status/badge atualizados.
      if (aba !== "todas") {
        return atual.filter((l) => l.id !== id);
      }
      return atual.map((l) => (l.id === id ? { ...l, status: novoStatus } : l));
    });
  }

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
          <p className="text-xs font-semibold tracking-wide text-error">{rotuloTotal}</p>
          <p className="text-3xl font-extrabold mt-1 text-error">{formatarMoeda(totalExibido)}</p>
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
              type="button"
              onClick={() => setAba(opt.valor)}
              className={`chip-toggle ${aba === opt.valor ? "chip-toggle-ativo-perigo" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : (
          <LancamentosLista lancamentos={lancamentos} aoAlterarStatus={aoAlterarStatusLocal} />
        )}
      </div>
    </div>
  );
}

export default function ContasAPagar() {
  return (
    <Suspense
      fallback={
        <div>
          <div className="header-gradient">
            <h1 className="text-2xl font-bold">Contas a pagar</h1>
          </div>
          <p className="text-center text-muted text-sm py-10">Carregando...</p>
        </div>
      }
    >
      <ContasAPagarConteudo />
    </Suspense>
  );
}
