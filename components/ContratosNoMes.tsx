// ============================================================================
// COMPONENTE: "Contratos no mês" (tela Contratos)
// ----------------------------------------------------------------------------
// Mesmo padrão de seletor usado no Financeiro/Início: navega mês a mês por
// padrão, com opção de trocar para um período personalizado (datas exatas).
// Mostra a quantidade de contratos criados dentro do mês/período escolhido.
//
// Recebe a lista de contratos já carregada pela página (só usa "criadoEm"),
// então não faz fetch — o filtro é local, sem chamada extra à API.
// ============================================================================
"use client";

import { useState } from "react";
import MesSeletor from "./MesSeletor";
import { IconCalendar, IconDocument } from "./Icons";

function isoHoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

export default function ContratosNoMes({ contratos }: { contratos: { criadoEm: string }[] }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [periodoPersonalizado, setPeriodoPersonalizado] = useState(false);
  const [dataDe, setDataDe] = useState(isoHoje(-30));
  const [dataAte, setDataAte] = useState(isoHoje());

  let inicio: Date;
  let fim: Date;
  if (periodoPersonalizado) {
    inicio = new Date(`${dataDe}T00:00:00`);
    fim = new Date(`${dataAte}T23:59:59`);
  } else {
    inicio = new Date(ano, mes, 1);
    fim = new Date(ano, mes + 1, 0, 23, 59, 59);
  }
  const quantidade = contratos.filter((c) => {
    const d = new Date(c.criadoEm);
    return d >= inicio && d <= fim;
  }).length;

  return (
    <div className="px-5 mt-5 space-y-3">
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted">
            {periodoPersonalizado ? "PERÍODO PERSONALIZADO" : "MÊS"}
          </p>
          <button
            type="button"
            onClick={() => setPeriodoPersonalizado((v) => !v)}
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
              onChange={(e) => setDataDe(e.target.value)}
              className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <span className="text-muted text-sm">até</span>
            <input
              type="date"
              value={dataAte}
              onChange={(e) => setDataAte(e.target.value)}
              className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
        ) : (
          <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
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
