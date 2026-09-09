// ============================================================================
// COMPONENTE: Mini calendário (grade de dias, com navegação de mês)
// ----------------------------------------------------------------------------
// Calendário de verdade (dia a dia), diferente do MesSeletor (que só navega
// mês inteiro com < >). Usado dentro do SeletorData para deixar o usuário
// escolher qualquer dia, com o mês visível navegável independente do dia
// já selecionado — só muda o que está selecionado quando o dia é clicado.
// ============================================================================
"use client";

import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "./Icons";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function gerarGrade(anoVisivel: number, mesVisivel: number): Date[] {
  const primeiroDia = new Date(anoVisivel, mesVisivel, 1);
  const inicioGrade = new Date(primeiroDia);
  inicioGrade.setDate(primeiroDia.getDate() - primeiroDia.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const dia = new Date(inicioGrade);
    dia.setDate(inicioGrade.getDate() + i);
    return dia;
  });
}

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function MiniCalendario({
  selecionado,
  onSelecionar,
}: {
  selecionado: Date;
  onSelecionar: (data: Date) => void;
}) {
  const [anoVisivel, setAnoVisivel] = useState(selecionado.getFullYear());
  const [mesVisivel, setMesVisivel] = useState(selecionado.getMonth());

  const hoje = new Date();
  const dias = gerarGrade(anoVisivel, mesVisivel);
  const nomeMes = new Date(anoVisivel, mesVisivel, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function irPara(delta: number) {
    const data = new Date(anoVisivel, mesVisivel + delta, 1);
    setAnoVisivel(data.getFullYear());
    setMesVisivel(data.getMonth());
  }

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <button type="button" className="mini-calendar-nav" onClick={() => irPara(-1)} aria-label="Mês anterior">
          <IconChevronLeft size={16} />
        </button>
        <p className="font-bold capitalize">{nomeMes}</p>
        <button type="button" className="mini-calendar-nav" onClick={() => irPara(1)} aria-label="Próximo mês">
          <IconChevronRight size={16} />
        </button>
      </div>

      <div className="mini-calendar-weekdays">
        {DIAS_SEMANA.map((dia) => (
          <span key={dia}>{dia}</span>
        ))}
      </div>

      <div className="mini-calendar-grid">
        {dias.map((dia) => {
          const foraDoMes = dia.getMonth() !== mesVisivel;
          const ehSelecionado = mesmoDia(dia, selecionado);
          const ehHoje = mesmoDia(dia, hoje);
          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => onSelecionar(dia)}
              aria-current={ehSelecionado ? "date" : undefined}
              className={
                "mini-calendar-day" +
                (foraDoMes ? " mini-calendar-day-fora" : "") +
                (ehSelecionado ? " mini-calendar-day-selecionado" : ehHoje ? " mini-calendar-day-hoje" : "")
              }
            >
              {dia.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
