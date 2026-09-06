// ============================================================================
// COMPONENTE: Resumo do mês (tela Início)
// ----------------------------------------------------------------------------
// Mesmo seletor de mês usado em "Transações" (app/financeiro), só que aqui
// dentro da Início. Mostra, para o mês selecionado:
//   - Saldo do mês (balanço: receitas pagas - despesas pagas) — card grande
//   - A receber no mês (pendente, com vencimento dentro do mês)
//   - Saldo atual em todas as contas (não é "do mês" — é o saldo corrente
//     de todas as carteiras/contas bancárias, somado)
//   - Despesas pagas no mês
//   - Total de despesas no mês (pagas + ainda pendentes)
//   - Receitas − despesas do mês (total de receitas do mês, pagas + a
//     receber, menos o total de despesas do mês, pagas + a pagar)
//
// Client component porque o mês navega sem recarregar a página — os dados
// vêm de duas APIs já existentes: /api/financeiro/resumo (mês) e
// /api/financeiro/contas-resumo (saldo total em contas, não muda com o mês).
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatarMoeda } from "../lib/financeiro";
import MesSeletor from "./MesSeletor";
import CardSaldo from "./CardSaldo";
import { tonCss } from "../lib/estiloCard";
import { IconTrendUp, IconTrendDown, IconBuilding, IconWallet } from "./Icons";

type ResumoMes = {
  balanco: number;
  aReceberDoMes: number;
  despesasDoMes: number;
  totalDespesasDoMes: number;
  totalReceitasDoMes: number;
};

export default function ResumoMesInicio() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [saldoContas, setSaldoContas] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    fetch(`/api/financeiro/resumo?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then((data: ResumoMes) => {
        setResumo(data);
        setCarregando(false);
      });
  }, [ano, mes]);

  // Saldo em contas não depende do mês selecionado (é o saldo corrente),
  // então busca uma vez só, fora do efeito acima.
  useEffect(() => {
    fetch("/api/financeiro/contas-resumo")
      .then((r) => r.json())
      .then((data: { totalGeral: number }) => setSaldoContas(data.totalGeral));
  }, []);

  return (
    <div>
      <div className="card space-y-3">
        <p className="text-xs font-semibold tracking-wide text-muted">MÊS</p>
        <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
      </div>

      <div className="mt-4">
        <CardSaldo
          label="SALDO DO MÊS"
          valor={carregando ? "R$ —" : formatarMoeda(resumo?.balanco ?? 0)}
          corValor={(resumo?.balanco ?? 0) >= 0 ? "var(--color-success)" : "var(--color-error)"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link href="/financeiro/receber" className="card stat-card" style={tonCss("var(--color-primary)", "var(--color-primary-subtle)")}>
          <div className="stat-icon">
            <IconTrendUp size={18} />
          </div>
          <p className="text-[11px] font-semibold tracking-wide text-muted">A RECEBER NO MÊS</p>
          <p className="font-extrabold mt-1">{carregando ? "—" : formatarMoeda(resumo?.aReceberDoMes ?? 0)}</p>
        </Link>

        <Link href="/financeiro/contas" className="card stat-card" style={tonCss("var(--color-accent)", "var(--color-accent-subtle)")}>
          <div className="stat-icon">
            <IconBuilding size={18} />
          </div>
          <p className="text-[11px] font-semibold tracking-wide text-muted">SALDO EM CONTAS</p>
          <p className="font-extrabold mt-1">{saldoContas === null ? "—" : formatarMoeda(saldoContas)}</p>
        </Link>

        <Link href="/financeiro/pagar?aba=pagas" className="card stat-card" style={tonCss("var(--color-error)", "var(--color-error-subtle)")}>
          <div className="stat-icon">
            <IconTrendDown size={18} />
          </div>
          <p className="text-[11px] font-semibold tracking-wide text-muted">DESPESAS PAGAS NO MÊS</p>
          <p className="font-extrabold mt-1">{carregando ? "—" : formatarMoeda(resumo?.despesasDoMes ?? 0)}</p>
        </Link>

        <Link href="/financeiro/pagar" className="card stat-card" style={tonCss("var(--color-warning)", "var(--color-warning-subtle)")}>
          <div className="stat-icon">
            <IconWallet size={18} />
          </div>
          <p className="text-[11px] font-semibold tracking-wide text-muted">TOTAL DE DESPESAS NO MÊS</p>
          <p className="font-extrabold mt-1">{carregando ? "—" : formatarMoeda(resumo?.totalDespesasDoMes ?? 0)}</p>
        </Link>
      </div>

      {/* Receitas - despesas do mês: total de receitas do mês (pagas + a
          receber) menos o total de despesas do mês (pagas + a pagar) —
          diferente do "Saldo do mês" acima, que só olha o que já ACONTECEU
          (pago), este aqui projeta o mês inteiro como se tudo fosse
          resolvido (recebido/pago). */}
      <div className="mt-4">
        <CardSaldo
          label="RECEITAS − DESPESAS DO MÊS"
          valor={carregando ? "R$ —" : formatarMoeda((resumo?.totalReceitasDoMes ?? 0) - (resumo?.totalDespesasDoMes ?? 0))}
          corValor={
            (resumo?.totalReceitasDoMes ?? 0) - (resumo?.totalDespesasDoMes ?? 0) >= 0
              ? "var(--color-success)"
              : "var(--color-error)"
          }
        />
      </div>
    </div>
  );
}
