// ============================================================================
// COMPONENTE: Movimentações recentes (tela Início)
// ----------------------------------------------------------------------------
// Client component pra respeitar a carteira selecionada no seletor da
// Início (ver CarteirasInicio + CarteiraContext) — antes esse bloco era
// renderizado direto em app/page.tsx a partir de um resumo GERAL, sem
// nenhuma filtragem por carteira (bug relatado: trocar de carteira não
// mudava as movimentações mostradas). Os dados vêm de
// /api/financeiro/movimentacoes, que já aplica esse filtro (ver lá).
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatarMoeda } from "../lib/financeiro";
import { useCarteiraSelecionada } from "./CarteiraContext";
import { IconTrendUp, IconTrendDown } from "./Icons";

type Movimentacao = { id: string; data: string; descricao: string; valor: number; entrada: boolean };

export default function MovimentacoesRecentesInicio() {
  const { carteiraId } = useCarteiraSelecionada();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const carteiraQuery = carteiraId ? `?carteiraId=${encodeURIComponent(carteiraId)}` : "";
    fetch(`/api/financeiro/movimentacoes${carteiraQuery}`)
      .then((r) => r.json())
      .then((data: Movimentacao[]) => {
        setMovimentacoes(data);
        setCarregando(false);
      });
  }, [carteiraId]);

  return (
    <div className="home-activity">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold tracking-wide text-muted">MOVIMENTAÇÕES RECENTES</p>
        <Link href="/historico" className="text-primary text-sm font-semibold">
          Ver tudo
        </Link>
      </div>

      <div className="space-y-3">
        {carregando ? (
          <div className="card text-center text-muted text-sm">Carregando...</div>
        ) : movimentacoes.length === 0 ? (
          <div className="card text-center text-muted text-sm">Nenhuma movimentação registrada ainda.</div>
        ) : (
          movimentacoes.map((m) => (
            <div key={m.id} className="card flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  background: m.entrada ? "var(--color-success-subtle)" : "var(--color-error-subtle)",
                  color: m.entrada ? "var(--color-success)" : "var(--color-error)",
                }}
              >
                {m.entrada ? <IconTrendUp size={18} /> : <IconTrendDown size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{m.descricao}</p>
                <p className="text-xs text-muted">{new Date(m.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
              </div>
              <p className="font-bold flex-shrink-0" style={{ color: m.entrada ? "var(--color-success)" : "var(--color-error)" }}>
                {m.entrada ? "+" : "−"} {formatarMoeda(m.valor)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
