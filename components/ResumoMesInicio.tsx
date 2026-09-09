// ============================================================================
// COMPONENTE: Resumo do mês (tela Início)
// ----------------------------------------------------------------------------
// Mesmo seletor de mês usado em "Transações" (app/financeiro), só que aqui
// dentro da Início. Mostra, para o mês selecionado:
//   - Saldo em contas (saldo corrente de todas as carteiras/contas
//     bancárias, somado — não é "do mês") — card grande, com badge de
//     "tudo em dia"/"N em atraso" e o par recebido/a receber no mês
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
import Badge from "./Badge";
import { tonCss } from "../lib/estiloCard";
import { IconTrendUp, IconTrendDown, IconWallet } from "./Icons";

type ResumoMes = {
  balanco: number;
  aReceberDoMes: number;
  receitasDoMes: number;
  despesasDoMes: number;
  totalDespesasDoMes: number;
  totalReceitasDoMes: number;
  atrasadas: number;
};

export default function ResumoMesInicio({ carteiraId }: { carteiraId?: string | null }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [saldoContas, setSaldoContas] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const carteiraQuery = carteiraId ? `&carteiraId=${encodeURIComponent(carteiraId)}` : "";
    fetch(`/api/financeiro/resumo?ano=${ano}&mes=${mes}${carteiraQuery}`)
      .then((r) => r.json())
      .then((data: ResumoMes) => {
        setResumo(data);
        setCarregando(false);
      });
  }, [ano, mes, carteiraId]);

  // Saldo em contas não depende do mês selecionado (é o saldo corrente),
  // então busca uma vez só, fora do efeito acima.
  useEffect(() => {
    const carteiraQuery = carteiraId ? `?carteiraId=${encodeURIComponent(carteiraId)}` : "";
    fetch(`/api/financeiro/contas-resumo${carteiraQuery}`)
      .then((r) => r.json())
      .then((data: { totalGeral: number }) => setSaldoContas(data.totalGeral));
  }, [carteiraId]);

  return (
    <div className="home-month-summary">
      <div className="home-month-selector card space-y-3">
        <p className="text-xs font-semibold tracking-wide text-muted">MÊS</p>
        <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
      </div>

      <div className="home-month-balance mt-4">
        <CardSaldo
          label="SALDO EM CONTAS"
          valor={saldoContas === null ? "R$ —" : formatarMoeda(saldoContas)}
          badge={
            <Badge tom={(resumo?.atrasadas ?? 0) > 0 ? "vermelho" : "verde"}>
              {carregando ? "Carregando…" : (resumo?.atrasadas ?? 0) > 0 ? `${resumo?.atrasadas} em atraso` : "Tudo em dia"}
            </Badge>
          }
        >
          <div className="balance-split mt-4 relative">
            <Link href="/financeiro/receber?aba=recebidas" className="balance-split-item" style={{ "--tone": "var(--color-success)", "--tone-subtle": "var(--color-success-subtle)" } as React.CSSProperties}>
              <span className="balance-split-icon"><IconTrendUp size={16} /></span>
              <span className="balance-split-text">
                <span className="balance-split-label">RECEBIDO</span>
                <span className="balance-split-value">{carregando ? "—" : formatarMoeda(resumo?.receitasDoMes ?? 0)}</span>
              </span>
            </Link>
            <Link href="/financeiro/receber" className="balance-split-item" style={{ "--tone": "var(--color-warning)", "--tone-subtle": "var(--color-warning-subtle)" } as React.CSSProperties}>
              <span className="balance-split-icon"><IconTrendDown size={16} /></span>
              <span className="balance-split-text">
                <span className="balance-split-label">A RECEBER</span>
                <span className="balance-split-value">{carregando ? "—" : formatarMoeda(resumo?.aReceberDoMes ?? 0)}</span>
              </span>
            </Link>
          </div>
        </CardSaldo>
      </div>

      <div className="home-month-stats grid grid-cols-2 gap-3 mt-4">
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
      <div className="home-month-projection mt-4">
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
