// ============================================================================
// COMPONENTE: Seletor de UMA data (botão "08 de setembro de 2026" + calendário)
// ----------------------------------------------------------------------------
// Mesmo padrão visual do SeletorData (usado no filtro de período da Início),
// só que para escolher uma única data — usado em popups como "Receber
// pagamento" no lugar do <input type="date"> nativo, pra manter o mesmo
// design em todo o app. Reaproveita o MiniCalendario em modoUnico (ver
// components/MiniCalendario.tsx) — o primeiro toque já fecha a seleção.
// ============================================================================
"use client";

import { useEffect, useRef, useState } from "react";
import { IconCalendar } from "./Icons";
import MiniCalendario from "./MiniCalendario";

export default function SeletorDataUnica({
  valor,
  onSelecionar,
  label,
}: {
  valor: string; // yyyy-mm-dd
  onSelecionar: (novoValor: string) => void;
  label?: string;
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

  const data = new Date(`${valor}T00:00:00`);
  const rotulo = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  function formatarISO(d: Date) {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  return (
    <div className="date-picker" ref={raiz}>
      {label && <p className="text-xs font-semibold tracking-wide text-muted mb-2">{label}</p>}
      <button
        type="button"
        className="card date-picker-trigger"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={label || "Escolher data"}
      >
        <span className="date-picker-icon">
          <IconCalendar size={18} />
        </span>
        <span className="font-bold capitalize">{rotulo}</span>
      </button>

      {aberto && (
        <div className="date-picker-popover">
          <MiniCalendario
            inicio={data}
            fim={data}
            modoUnico
            onSelecionar={(novaData) => {
              onSelecionar(formatarISO(novaData));
              setAberto(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
