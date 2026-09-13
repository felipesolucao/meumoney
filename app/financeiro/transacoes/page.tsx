// ============================================================================
// PÁGINA: Ver todas transações
// ----------------------------------------------------------------------------
// Lista única e filtrável de tudo que já aconteceu no Financeiro — Lancamento
// (receita/despesa), CompraCartao (compra no cartão ainda não fechada em
// fatura) e Parcela de contrato de empréstimo (aba "Contratos") — ver
// /api/financeiro/transacoes.
//
// Reaproveita o MESMO seletor de período + saldo em contas + balanço do
// período já usados na Início (components/ResumoMesInicio), agora em modo
// controlado (via os props "periodo"/"onPeriodoChange") pra essa tela poder
// usar o período escolhido também pra filtrar a lista de transações abaixo —
// ver o comentário desses props no próprio ResumoMesInicio.
// ============================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatarMoeda } from "../../../lib/financeiro";
import { agruparPorDia } from "../../../lib/calculos";
import BotaoVoltar from "../../../components/BotaoVoltar";
import ResumoMesInicio from "../../../components/ResumoMesInicio";
import TransacaoCard, { TransacaoItem } from "../../../components/TransacaoCard";
import { IconSearch } from "../../../components/Icons";

type Tipo = "transacoes" | "receitas" | "despesas" | "contratos";

const ABAS: { valor: Tipo; label: string }[] = [
  { valor: "transacoes", label: "Transações" },
  { valor: "receitas", label: "Receitas" },
  { valor: "despesas", label: "Despesas" },
  { valor: "contratos", label: "Contratos" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatarISO(data: Date) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function inicioDoMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
}

function fimDoMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
}

export default function VerTodasTransacoes() {
  const [tipo, setTipo] = useState<Tipo>("transacoes");
  const [inicio, setInicio] = useState(inicioDoMesAtual);
  const [fim, setFim] = useState(fimDoMesAtual);
  const [buscaDigitada, setBuscaDigitada] = useState("");
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<TransacaoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Debounce simples — evita disparar uma busca a cada tecla digitada.
  useEffect(() => {
    const id = setTimeout(() => setBusca(buscaDigitada.trim()), 300);
    return () => clearTimeout(id);
  }, [buscaDigitada]);

  useEffect(() => {
    setCarregando(true);
    const params = new URLSearchParams({
      tipo,
      de: formatarISO(inicio),
      ate: formatarISO(fim),
    });
    if (busca) params.set("busca", busca);

    fetch(`/api/financeiro/transacoes?${params.toString()}`)
      .then((r) => r.json())
      .then((data: TransacaoItem[]) => {
        setItens(data);
        setCarregando(false);
      });
  }, [tipo, inicio, fim, busca]);

  const grupos = useMemo(() => {
    const agrupado = agruparPorDia(itens, (i) => i.data);
    return agrupado.map((g) => ({
      ...g,
      total: g.itens.reduce((s, i) => s + (i.entrada ? i.valor : -i.valor), 0),
    }));
  }, [itens]);

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro" />
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          <p className="text-muted text-sm">Histórico e balanço completos</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4 pb-4">
        {/* --- Transações / Receitas / Despesas / Contratos --------------------- */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ABAS.map((aba) => (
            <button
              key={aba.valor}
              type="button"
              onClick={() => setTipo(aba.valor)}
              className={`chip-toggle whitespace-nowrap ${tipo === aba.valor ? "chip-toggle-ativo" : ""}`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        {/* --- Período + saldo em contas + balanço do período (mesmo bloco da Início) --- */}
        <ResumoMesInicio
          periodo={{ inicio, fim }}
          onPeriodoChange={(novoInicio, novoFim) => {
            setInicio(novoInicio);
            setFim(novoFim);
          }}
        />

        {/* --- Busca por nome ou valor -------------------------------------------- */}
        <div className="relative">
          <IconSearch size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={buscaDigitada}
            onChange={(e) => setBuscaDigitada(e.target.value)}
            placeholder="Buscar por nome ou valor..."
            className="w-full rounded-md border border-border pl-11 pr-4 py-3.5 outline-none focus:border-primary bg-card"
          />
        </div>

        {/* --- Transações, agrupadas por dia com o total de cada dia -------------- */}
        {carregando ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : grupos.length === 0 ? (
          <div className="card text-center text-muted text-sm">Nenhuma transação encontrada neste período.</div>
        ) : (
          <div className="space-y-5">
            {grupos.map((grupo) => (
              <div key={grupo.rotulo}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold tracking-wide text-muted">{grupo.rotulo}</p>
                  <p
                    className="text-xs font-bold"
                    style={{ color: grupo.total >= 0 ? "var(--color-success)" : "var(--color-error)" }}
                  >
                    {grupo.total >= 0 ? "+" : "−"} {formatarMoeda(Math.abs(grupo.total))}
                  </p>
                </div>
                <div className="space-y-3">
                  {grupo.itens.map((item) => (
                    <TransacaoCard key={item.id} transacao={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
