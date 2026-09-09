// ============================================================================
// COMPONENTE: Resumo do mês (tela Início)
// ----------------------------------------------------------------------------
// Mostra, para o mês da data selecionada:
//   - Saldo em contas (saldo corrente de todas as carteiras/contas
//     bancárias, somado — não é "do mês") — card grande, com badge de
//     "tudo em dia"/"N em atraso" e a grade recebido/a receber/despesas
//     pagas/despesas total do mês, tudo no mesmo padrão visual (pills)
//   - Receitas − despesas do mês (total de receitas do mês, pagas + a
//     receber, menos o total de despesas do mês, pagas + a pagar)
//
// A data é escolhida pelo SeletorData (barra "08 de setembro de 2026" que
// abre um mini calendário) — só o mês/ano da data escolhida importa para os
// filtros abaixo, o dia em si é só para o usuário "apontar" um período.
//
// Client component porque a data navega sem recarregar a página — os dados
// vêm de duas APIs já existentes: /api/financeiro/resumo (mês) e
// /api/financeiro/contas-resumo (saldo total em contas, não muda com o mês).
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatarMoeda } from "../lib/financeiro";
import SeletorData from "./SeletorData";
import CardSaldo from "./CardSaldo";
import Badge from "./Badge";
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
  const [dataSelecionada, setDataSelecionada] = useState(() => new Date());

  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [saldoContas, setSaldoContas] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const ano = dataSelecionada.getFullYear();
    const mes = dataSelecionada.getMonth();
    const carteiraQuery = carteiraId ? `&carteiraId=${encodeURIComponent(carteiraId)}` : "";
    fetch(`/api/financeiro/resumo?ano=${ano}&mes=${mes}${carteiraQuery}`)
      .then((r) => r.json())
      .then((data: ResumoMes) => {
        setResumo(data);
        setCarregando(false);
      });
  }, [dataSelecionada, carteiraId]);

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
      <div className="home-month-selector">
        <SeletorData valor={dataSelecionada} onSelecionar={setDataSelecionada} />
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
            <Link href="/financeiro/pagar?aba=pagas" className="balance-split-item" style={{ "--tone": "var(--color-error)", "--tone-subtle": "var(--color-error-subtle)" } as React.CSSProperties}>
              <span className="balance-split-icon"><IconTrendDown size={16} /></span>
              <span className="balance-split-text">
                <span className="balance-split-label">DESPESAS PAGAS</span>
                <span className="balance-split-value">{carregando ? "—" : formatarMoeda(resumo?.despesasDoMes ?? 0)}</span>
              </span>
            </Link>
            <Link href="/financeiro/pagar" className="balance-split-item" style={{ "--tone": "var(--color-muted)", "--tone-subtle": "var(--color-muted-surface)" } as React.CSSProperties}>
              <span className="balance-split-icon"><IconWallet size={16} /></span>
              <span className="balance-split-text">
                <span className="balance-split-label">DESPESAS TOTAL</span>
                <span className="balance-split-value">{carregando ? "—" : formatarMoeda(resumo?.totalDespesasDoMes ?? 0)}</span>
              </span>
            </Link>
          </div>
        </CardSaldo>
      </div>

      {/* Receitas - despesas do mês: total de receitas do mês (pagas + a
          receber) menos o total de despesas do mês (pagas + a pagar) —
          projeta o mês inteiro como se tudo fosse resolvido (recebido/pago),
          diferente do saldo em contas acima, que é o saldo corrente. */}
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
