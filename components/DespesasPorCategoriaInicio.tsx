// ============================================================================
// COMPONENTE: Despesas por categoria (versão compacta, tela Início)
// ----------------------------------------------------------------------------
// Mostra as até 4 categorias de despesa com maior gasto no mês atual, cada
// uma com uma barrinha de percentual — um resumo rápido do relatório
// completo, que continua em /financeiro/relatorios (com gráfico de
// pizza/barras e a lista de maiores lançamentos). Sempre olha o mês atual
// (não tem seletor de mês próprio — é um resumo rápido, não a tela cheia).
//
// NOVO: cada categoria agora é um link para /financeiro/categorias/[id] —
// a tela que já existe com o histórico de lançamentos daquela categoria,
// com seletor de mês (mesmo MesSeletor usado em Contas a pagar/receber).
// Antes, essas linhas não levavam a lugar nenhum.
//
// CORRIGIDO: agora filtra pela carteira selecionada no seletor da Início
// (ver CarteirasInicio + CarteiraContext) — antes sempre somava despesas de
// TODAS as carteiras, mesmo com uma carteira específica escolhida.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatarMoeda } from "../lib/financeiro";
import { useCarteiraSelecionada } from "./CarteiraContext";
import { IconChart } from "./Icons";

type CategoriaResumo = { id: string; nome: string; icone: string; cor: string; total: number; percentual: number };
type Resumo = { total: number; categorias: CategoriaResumo[] };

export default function DespesasPorCategoriaInicio() {
  const { carteiraId } = useCarteiraSelecionada();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const hoje = new Date();
    const carteiraQuery = carteiraId ? `&carteiraId=${encodeURIComponent(carteiraId)}` : "";
    fetch(`/api/financeiro/categorias-resumo?tipo=despesa&ano=${hoje.getFullYear()}&mes=${hoje.getMonth()}${carteiraQuery}`)
      .then((r) => r.json())
      .then((data: Resumo) => {
        setResumo(data);
        setCarregando(false);
      });
  }, [carteiraId]);

  const categorias = (resumo?.categorias ?? []).slice(0, 4);

  return (
    <div className="home-categories">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold tracking-wide text-muted">DESPESAS POR CATEGORIA (MÊS)</p>
        <Link href="/financeiro/relatorios" className="text-primary text-sm font-semibold flex items-center gap-1">
          <IconChart size={14} /> Ver relatório
        </Link>
      </div>

      <div className="card">
        {carregando ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : categorias.length === 0 ? (
          <p className="text-center text-muted text-sm py-6">Nenhuma despesa paga neste mês ainda.</p>
        ) : (
          <div className="space-y-3">
            {categorias.map((c) => (
              // NOVO: cada categoria vira um link pro histórico completo
              // (/financeiro/categorias/[id]), que já abre com o mês atual e
              // deixa trocar de mês por lá — ver comentário no topo do arquivo.
              <Link
                key={c.id}
                href={`/financeiro/categorias/${c.id}`}
                className="block -mx-1 px-1 py-0.5 rounded-md active:bg-background"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="shrink-0">{c.icone}</span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{c.nome}</span>
                  <span className="text-sm font-bold shrink-0">{formatarMoeda(c.total)}</span>
                  <span className="text-xs text-muted w-10 text-right shrink-0">{c.percentual.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-muted-surface)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(c.percentual, 100)}%`, background: c.cor }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
