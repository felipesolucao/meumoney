// ============================================================================
// COMPONENTE: "Contratos no mês" (tela Contratos) — parte controlada
// ----------------------------------------------------------------------------
// Mesmo padrão de seletor usado no Financeiro/Início: navega mês a mês por
// padrão, com opção de trocar para um período personalizado (datas exatas).
//
// Componente 100% controlado — quem guarda o estado (mês/período) é a
// página (app/contratos/page.tsx), porque o mesmo período também precisa
// filtrar o resumo e a lista de contratos logo abaixo. Este componente só
// desenha o seletor e recebe a quantidade já calculada pelo pai.
// ============================================================================
"use client";

import MesSeletor from "./MesSeletor";
import { IconCalendar, IconDocument } from "./Icons";

export default function ContratosNoMes({
  ano,
  mes,
  onMudarMes,
  periodoPersonalizado,
  onTogglePersonalizado,
  dataDe,
  onMudarDataDe,
  dataAte,
  onMudarDataAte,
  quantidade,
}: {
  ano: number;
  mes: number;
  onMudarMes: (ano: number, mes: number) => void;
  periodoPersonalizado: boolean;
  onTogglePersonalizado: () => void;
  dataDe: string;
  onMudarDataDe: (valor: string) => void;
  dataAte: string;
  onMudarDataAte: (valor: string) => void;
  quantidade: number;
}) {
  return (
    <div className="px-5 mt-5 space-y-3">
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted">
            {periodoPersonalizado ? "PERÍODO PERSONALIZADO" : "MÊS"}
          </p>
          <button
            type="button"
            onClick={onTogglePersonalizado}
            className="text-xs font-semibold text-primary flex items-center gap-1"
          >
            <IconCalendar size={13} />
            {periodoPersonalizado ? "Ver por mês" : "Período personalizado"}
          </button>
        </div>

        {periodoPersonalizado ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dataDe}
              onChange={(e) => onMudarDataDe(e.target.value)}
              className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <span className="text-muted text-sm">até</span>
            <input
              type="date"
              value={dataAte}
              onChange={(e) => onMudarDataAte(e.target.value)}
              className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
        ) : (
          <MesSeletor ano={ano} mes={mes} onMudar={onMudarMes} />
        )}
      </div>

      <div className="card flex items-center gap-3">
        <div className="w-12 h-12 rounded-md bg-background flex items-center justify-center text-primary">
          <IconDocument size={22} />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted">
            {periodoPersonalizado ? "CONTRATOS NO PERÍODO" : "CONTRATOS NESTE MÊS"}
          </p>
          <p className="font-bold text-lg">{quantidade} contrato(s)</p>
        </div>
      </div>
    </div>
  );
}
