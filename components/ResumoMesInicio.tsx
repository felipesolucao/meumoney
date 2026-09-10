// ============================================================================
// COMPONENTE: Resumo do período (tela Início)
// ----------------------------------------------------------------------------
// Mostra, para o período selecionado (duas datas, para permitir comparar
// períodos — ex.: 30 dias vs. os 30 dias anteriores, olhando o card duas
// vezes):
//   - Saldo em contas (saldo corrente de todas as carteiras/contas
//     bancárias, somado — não muda com o período) — card grande, com badge
//     de "tudo em dia"/"N em atraso" e a grade recebido/a receber/despesas
//     pagas/despesas total do período, tudo no mesmo padrão visual (pills)
//   - Receitas − despesas do período (total de receitas, pagas + a receber,
//     menos o total de despesas, pagas + a pagar)
//
// O período é escolhido pelo SeletorData (barra "08 de setembro de 2026",
// ou "08 set – 14 set 2026" quando é um intervalo, que abre atalhos rápidos
// + um mini calendário para marcar duas datas) — ver components/SeletorData.tsx.
//
// Client component porque o período navega sem recarregar a página — os
// dados vêm de duas APIs já existentes: /api/financeiro/resumo (aceita um
// período via ?de=&ate=) e /api/financeiro/contas-resumo (saldo total em
// contas, não muda com o período).
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
  aReceberContratosDoMes: number;
  aReceberTotal: number;
  receitasDoMes: number;
  despesasDoMes: number;
  totalDespesasDoMes: number;
  totalReceitasDoMes: number;
  totalContratosDoMes: number;
  temContratosNoMes: boolean;
  atrasadas: number;
};

function formatarISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function inicioDoMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
}

function fimDoMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
}

export default function ResumoMesInicio({ carteiraId }: { carteiraId?: string | null }) {
  const [inicio, setInicio] = useState(inicioDoMesAtual);
  const [fim, setFim] = useState(fimDoMesAtual);

  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [saldoContas, setSaldoContas] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const de = formatarISO(inicio);
    const ate = formatarISO(fim);
    const carteiraQuery = carteiraId ? `&carteiraId=${encodeURIComponent(carteiraId)}` : "";
    fetch(`/api/financeiro/resumo?de=${de}&ate=${ate}${carteiraQuery}`)
      .then((r) => r.json())
      .then((data: ResumoMes) => {
        setResumo(data);
        setCarregando(false);
      });
  }, [inicio, fim, carteiraId]);

  // Saldo em contas não depende do mês selecionado (é o saldo corrente),
  // então busca uma vez só, fora do efeito acima.
  useEffect(() => {
    const carteiraQuery = carteiraId ? `?carteiraId=${encodeURIComponent(carteiraId)}` : "";
    fetch(`/api/financeiro/contas-resumo${carteiraQuery}`)
      .then((r) => r.json())
      .then((data: { totalGeral: number }) => setSaldoContas(data.totalGeral));
  }, [carteiraId]);

  // Anexado nos 4 links abaixo pra abrir /financeiro/receber e
  // /financeiro/pagar já filtrados pelo mesmo período escolhido aqui, em vez
  // de sempre caírem no mês atual (ver app/financeiro/receber/page.tsx e
  // app/financeiro/pagar/page.tsx, que agora entendem esses parâmetros).
  const queryPeriodo = `de=${formatarISO(inicio)}&ate=${formatarISO(fim)}`;

  return (
    <div className="home-month-summary">
      <div className="home-month-selector">
        <SeletorData
          inicio={inicio}
          fim={fim}
          onSelecionar={(novoInicio, novoFim) => {
            setInicio(novoInicio);
            setFim(novoFim);
          }}
        />
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
            <Link href={`/financeiro/receber?aba=recebidas&${queryPeriodo}`} className="balance-split-item" style={{ "--tone": "var(--color-success)", "--tone-subtle": "var(--color-success-subtle)" } as React.CSSProperties}>
              <span className="balance-split-icon"><IconTrendUp size={16} /></span>
              <span className="balance-split-text">
                <span className="balance-split-label">RECEBIDO</span>
                <span className="balance-split-value">{carregando ? "—" : formatarMoeda(resumo?.receitasDoMes ?? 0)}</span>
              </span>
            </Link>
            <Link href={`/financeiro/receber?aba=pendentes&${queryPeriodo}`} className="balance-split-item" style={{ "--tone": "var(--color-warning)", "--tone-subtle": "var(--color-warning-subtle)" } as React.CSSProperties}>
              <span className="balance-split-icon"><IconTrendDown size={16} /></span>
              <span className="balance-split-text">
                <span className="balance-split-label">A RECEBER</span>
                <span className="balance-split-value">{carregando ? "—" : formatarMoeda(resumo?.aReceberTotal ?? 0)}</span>
              </span>
            </Link>
            <Link href={`/financeiro/pagar?aba=pagas&${queryPeriodo}`} className="balance-split-item" style={{ "--tone": "var(--color-error)", "--tone-subtle": "var(--color-error-subtle)" } as React.CSSProperties}>
              <span className="balance-split-icon"><IconTrendDown size={16} /></span>
              <span className="balance-split-text">
                <span className="balance-split-label">DESPESAS PAGAS</span>
                <span className="balance-split-value">{carregando ? "—" : formatarMoeda(resumo?.despesasDoMes ?? 0)}</span>
              </span>
            </Link>
            <Link href={`/financeiro/pagar?aba=todas&${queryPeriodo}`} className="balance-split-item" style={{ "--tone": "var(--color-muted)", "--tone-subtle": "var(--color-muted-surface)" } as React.CSSProperties}>
              <span className="balance-split-icon"><IconWallet size={16} /></span>
              <span className="balance-split-text">
                <span className="balance-split-label">DESPESAS TOTAL</span>
                <span className="balance-split-value">{carregando ? "—" : formatarMoeda(resumo?.totalDespesasDoMes ?? 0)}</span>
              </span>
            </Link>
          </div>
        </CardSaldo>
      </div>

      {/* Receitas - despesas do período: total de receitas (pagas + a
          receber) menos o total de despesas (pagas + a pagar) — projeta o
          período inteiro como se tudo fosse resolvido (recebido/pago),
          diferente do saldo em contas acima, que é o saldo corrente. */}
      <div className="home-month-projection mt-4">
        <CardSaldo
          label="RECEITAS − DESPESAS DO PERÍODO"
          valor={carregando ? "R$ —" : formatarMoeda((resumo?.totalReceitasDoMes ?? 0) - (resumo?.totalDespesasDoMes ?? 0))}
          corValor={
            (resumo?.totalReceitasDoMes ?? 0) - (resumo?.totalDespesasDoMes ?? 0) >= 0
              ? "var(--color-success)"
              : "var(--color-error)"
          }
        />
      </div>

      {/* Saldo final: mesma conta do card acima (receitas − despesas do
          período), mas somando também o total de contratos (parcelas de
          empréstimos, pagas + pendentes) vencendo dentro do período. Só
          aparece quando existem contratos no período selecionado — sem
          contratos, esse card seria idêntico ao de cima e não agregaria
          nada. Vale tanto pra "Geral" quanto pra uma carteira específica,
          já que contratos não pertencem a nenhuma carteira (ver comentário
          na API /api/financeiro/resumo). */}
      {!carregando && resumo?.temContratosNoMes && (
        <div className="home-month-final mt-4">
          <CardSaldo
            label="SALDO FINAL (COM CONTRATOS)"
            valor={formatarMoeda(
              (resumo?.totalContratosDoMes ?? 0) + (resumo?.totalReceitasDoMes ?? 0) - (resumo?.totalDespesasDoMes ?? 0)
            )}
            corValor={
              (resumo?.totalContratosDoMes ?? 0) + (resumo?.totalReceitasDoMes ?? 0) - (resumo?.totalDespesasDoMes ?? 0) >= 0
                ? "var(--color-success)"
                : "var(--color-error)"
            }
          />
        </div>
      )}
    </div>
  );
}
