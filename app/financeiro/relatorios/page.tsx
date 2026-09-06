// ============================================================================
// PÁGINA: Relatórios do Financeiro (gasto/receita por categoria)
// ----------------------------------------------------------------------------
// Não confundir com app/relatorios (esse é o relatório da carteira de
// empréstimos). Esta tela é específica do módulo Financeiro: mostra, para o
// mês selecionado, quanto foi gasto (ou recebido) em cada categoria — com
// gráfico de pizza ou barras, percentual por categoria, e os maiores
// lançamentos individuais do período.
//
// Só entra nessa conta o que já está PAGO (ver /api/financeiro/categorias-
// resumo) — pendente ainda não "aconteceu", então misturaria a proporção.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { formatarMoeda, formatarData } from "../../../lib/financeiro";
import type { TipoLancamento } from "../../../lib/financeiro";
import MesSeletor from "../../../components/MesSeletor";
import BotaoVoltar from "../../../components/BotaoVoltar";

type CategoriaResumo = {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  total: number;
  percentual: number;
};

type MaiorLancamento = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoriaNome: string | null;
  categoriaIcone: string | null;
};

type Resumo = {
  tipo: TipoLancamento;
  total: number;
  categorias: CategoriaResumo[];
  maiores: MaiorLancamento[];
};

type Visualizacao = "pizza" | "barra";

export default function RelatoriosFinanceiro() {
  const hoje = new Date();
  const [tipo, setTipo] = useState<TipoLancamento>("despesa");
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("pizza");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    fetch(`/api/financeiro/categorias-resumo?tipo=${tipo}&ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then((data: Resumo) => {
        setResumo(data);
        setCarregando(false);
      });
  }, [tipo, ano, mes]);

  const corTotal = tipo === "receita" ? "var(--color-primary)" : "var(--color-error)";
  // Extraídos uma vez pra evitar "resumo!.algo" (non-null assertion) repetido
  // pelo JSX inteiro — nos trechos onde são usados, "carregando" já é falso
  // e a lista vazia já foi tratada à parte, então o array aqui nunca falta.
  const categorias = resumo?.categorias ?? [];
  const maiores = resumo?.maiores ?? [];

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted mt-0.5">{tipo === "receita" ? "Receitas" : "Despesas"} por categoria</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5 pb-4">
        {/* --- Despesa / Receita ------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo("despesa")}
            className={tipo === "despesa" ? "btn-danger !py-3.5" : "btn-outline !py-3.5"}
          >
            Despesas
          </button>
          <button
            type="button"
            onClick={() => setTipo("receita")}
            className={tipo === "receita" ? "btn-primary !py-3.5" : "btn-outline !py-3.5"}
          >
            Receitas
          </button>
        </div>

        <div className="card">
          <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
        </div>

        {/* --- Hero card: gráfico + percentual por categoria --------------------- */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold tracking-wide text-muted">
              {tipo === "receita" ? "RECEITAS" : "DESPESAS"} POR CATEGORIA
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setVisualizacao("pizza")}
                className={`btn-chip !min-h-0 !py-1.5 !px-3 text-xs ${visualizacao === "pizza" ? "btn-primary" : "btn-outline"}`}
              >
                Pizza
              </button>
              <button
                type="button"
                onClick={() => setVisualizacao("barra")}
                className={`btn-chip !min-h-0 !py-1.5 !px-3 text-xs ${visualizacao === "barra" ? "btn-primary" : "btn-outline"}`}
              >
                Barras
              </button>
            </div>
          </div>

          <p className="text-2xl font-extrabold mt-2" style={{ color: corTotal }}>
            {carregando ? "—" : formatarMoeda(resumo?.total ?? 0)}
          </p>

          {carregando ? (
            <p className="text-center text-muted text-sm py-8">Carregando...</p>
          ) : categorias.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">
              Nenhum{tipo === "receita" ? "a receita paga" : "a despesa paga"} neste mês.
            </p>
          ) : (
            <div className="mt-4">
              {visualizacao === "pizza" ? (
                <GraficoPizza categorias={categorias} />
              ) : (
                <GraficoBarras categorias={categorias} />
              )}

              {/* --- Legenda: bolinha colorida + nome + valor + percentual ------- */}
              <div className="space-y-2.5 mt-5">
                {categorias.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: c.cor }}
                      aria-hidden="true"
                    />
                    <span className="shrink-0">{c.icone}</span>
                    <span className="flex-1 min-w-0 truncate text-sm font-medium">{c.nome}</span>
                    <span className="text-sm font-bold shrink-0">{formatarMoeda(c.total)}</span>
                    <span className="text-xs text-muted w-12 text-right shrink-0">{c.percentual.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* --- Maiores lançamentos do período ------------------------------------ */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">
            MAIOR{tipo === "receita" ? "ES RECEITAS" : "ES GASTOS"} DO MÊS
          </p>
          {carregando ? (
            <p className="text-center text-muted text-sm py-6">Carregando...</p>
          ) : maiores.length === 0 ? (
            <div className="card text-center text-muted text-sm">Nada por aqui ainda.</div>
          ) : (
            <div className="list-gap">
              {maiores.map((m, i) => (
                <div key={m.id} className="card !py-3 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-md bg-background flex items-center justify-center text-xs font-bold text-muted shrink-0">
                    {i + 1}º
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{m.descricao}</p>
                    <p className="text-xs text-muted">
                      {[m.categoriaNome, formatarData(m.data)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="font-bold shrink-0" style={{ color: corTotal }}>
                    {formatarMoeda(m.valor)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// GRÁFICO DE PIZZA (donut) — SVG puro, sem biblioteca externa.
// ----------------------------------------------------------------------------
// Cada categoria vira um segmento do círculo, desenhado com stroke-dasharray
// (comprimento do traço = percentual da categoria) e stroke-dashoffset
// (deslocamento = soma acumulada dos percentuais anteriores). Começa às 12h
// (rotate -90deg) e anda no sentido horário, como qualquer gráfico de pizza.
// ----------------------------------------------------------------------------
function GraficoPizza({ categorias }: { categorias: CategoriaResumo[] }) {
  const raio = 45;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <div className="flex justify-center">
      <svg width="180" height="180" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={raio} fill="none" stroke="var(--color-muted-bg)" strokeWidth="20" />
        {categorias.map((c) => {
          const comprimento = (c.percentual / 100) * circunferencia;
          const offset = -((acumulado / 100) * circunferencia);
          acumulado += c.percentual;
          return (
            <circle
              key={c.id}
              cx="60"
              cy="60"
              r={raio}
              fill="none"
              stroke={c.cor}
              strokeWidth="20"
              strokeDasharray={`${comprimento} ${circunferencia - comprimento}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ----------------------------------------------------------------------------
// GRÁFICO DE BARRAS — uma barra horizontal por categoria, proporcional à
// maior categoria do período (não ao total, pra não deixar as barras
// menores ilegíveis quando existem muitas categorias pequenas).
// ----------------------------------------------------------------------------
function GraficoBarras({ categorias }: { categorias: CategoriaResumo[] }) {
  const maior = Math.max(...categorias.map((c) => c.total), 1);

  return (
    <div className="space-y-3">
      {categorias.map((c) => (
        <div key={c.id}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">{c.icone} {c.nome}</span>
            <span className="font-semibold">{formatarMoeda(c.total)}</span>
          </div>
          <div className="h-2.5 rounded-pill bg-muted-bg overflow-hidden">
            <div
              className="h-full rounded-pill"
              style={{ width: `${(c.total / maior) * 100}%`, background: c.cor }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
