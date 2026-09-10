// ============================================================================
// COMPONENTE: Seletor de período (barra "08 de setembro de 2026" + calendário)
// ----------------------------------------------------------------------------
// Substitui o antigo seletor "< Setembro 2026 >" na Início por uma barra que
// mostra o período por extenso e, ao tocar, abre:
//   - atalhos rápidos (Hoje, Ontem, 7/15/30/60/90 dias)
//   - um mini calendário (dia a dia) para escolher duas datas e comparar
//     o período — ver components/MiniCalendario.tsx.
// ============================================================================
"use client";

import { useEffect, useRef, useState } from "react";
import { IconCalendar } from "./Icons";
import MiniCalendario from "./MiniCalendario";

function diasAtras(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
}

function diasAFrente(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

// Cada atalho é sempre "hoje" (atual, calculado na hora do clique — nunca
// fica parado numa data antiga). "Ontem" é só o dia anterior isolado, não
// um período. Os atalhos de N dias vão de hoje até hoje + (N-1) dias, pra
// totalizar N dias corridos contando o próprio dia de hoje — ex.: hoje dia
// 9, "7 dias" = 9 a 15 (9, 10, 11, 12, 13, 14, 15 = 7 dias).
function criarAtalhos(hoje: Date) {
  const ontem = diasAtras(hoje, 1);
  return [
    { rotulo: "Hoje", inicio: hoje, fim: hoje },
    { rotulo: "Ontem", inicio: ontem, fim: ontem },
    { rotulo: "7 dias", inicio: hoje, fim: diasAFrente(hoje, 6) },
    { rotulo: "15 dias", inicio: hoje, fim: diasAFrente(hoje, 14) },
    { rotulo: "30 dias", inicio: hoje, fim: diasAFrente(hoje, 29) },
    { rotulo: "60 dias", inicio: hoje, fim: diasAFrente(hoje, 59) },
    { rotulo: "90 dias", inicio: hoje, fim: diasAFrente(hoje, 89) },
  ];
}

function mesmoDia(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function SeletorData({
  inicio,
  fim,
  onSelecionar,
}: {
  inicio: Date;
  fim: Date;
  onSelecionar: (inicio: Date, fim: Date) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  const periodoUnico = mesmoDia(inicio, fim);
  const label = periodoUnico
    ? inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : `${inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;

  const atalhos = criarAtalhos(new Date());

  function aplicarAtalho(novoInicio: Date, novoFim: Date) {
    onSelecionar(novoInicio, novoFim);
    setAberto(false);
  }

  return (
    <div className="date-picker" ref={raiz}>
      <button
        type="button"
        className="card date-picker-trigger"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label="Personalizar período"
      >
        <span className="date-picker-icon">
          <IconCalendar size={18} />
        </span>
        <span className="font-bold capitalize">{label}</span>
      </button>

      {aberto && (
        <div className="date-picker-popover">
          <div className="date-picker-atalhos">
            {atalhos.map((atalho) => (
              <button
                key={atalho.rotulo}
                type="button"
                className="date-picker-atalho"
                onClick={() => aplicarAtalho(atalho.inicio, atalho.fim)}
              >
                {atalho.rotulo}
              </button>
            ))}
          </div>

          <MiniCalendario
            inicio={inicio}
            fim={fim}
            onSelecionar={(novoInicio, novoFim, completo) => {
              onSelecionar(novoInicio, novoFim);
              if (completo) setAberto(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
