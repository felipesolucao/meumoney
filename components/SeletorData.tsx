// ============================================================================
// COMPONENTE: Seletor de data (barra "08 de setembro de 2026" + calendário)
// ----------------------------------------------------------------------------
// Substitui o antigo seletor "< Setembro 2026 >" na Início por uma barra que
// mostra a data por extenso e, ao tocar, abre um mini calendário (dia a dia)
// para personalizar a data — ver components/MiniCalendario.tsx.
// ============================================================================
"use client";

import { useEffect, useRef, useState } from "react";
import { IconCalendar } from "./Icons";
import MiniCalendario from "./MiniCalendario";

export default function SeletorData({
  valor,
  onSelecionar,
}: {
  valor: Date;
  onSelecionar: (data: Date) => void;
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

  const label = valor.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="date-picker" ref={raiz}>
      <button
        type="button"
        className="card date-picker-trigger"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label="Personalizar data"
      >
        <span className="date-picker-icon">
          <IconCalendar size={18} />
        </span>
        <span className="font-bold capitalize">{label}</span>
      </button>

      {aberto && (
        <div className="date-picker-popover">
          <MiniCalendario
            selecionado={valor}
            onSelecionar={(data) => {
              onSelecionar(data);
              setAberto(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
