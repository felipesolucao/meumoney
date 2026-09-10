// ============================================================================
// COMPONENTE: Mini calendário (grade de dias, com seleção de período)
// ----------------------------------------------------------------------------
// Calendário de verdade (dia a dia), diferente do MesSeletor (que só navega
// mês inteiro com < >). Usado dentro do SeletorData para deixar o usuário
// escolher um período (duas datas) para comparar, com o mês visível
// navegável independente do período já selecionado.
//
// Seleção de intervalo: o primeiro clique começa um novo período (fica como
// um "dia único" enquanto a segunda data não é escolhida); o segundo clique
// fecha o período (ordenando as datas se o usuário clicar "para trás") e
// avisa o pai via onSelecionar, que também fecha o popover.
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

// Compara só a data (sem hora), pra não depender de o Date recebido ter
// vindo com hora zerada ou não (ex.: "hoje" traz a hora atual).
function diaSemHora(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function mesmoDia(a: Date, b: Date) {
  return diaSemHora(a).getTime() === diaSemHora(b).getTime();
}

export default function MiniCalendario({
  inicio,
  fim,
  onSelecionar,
  modoUnico = false,
}: {
  inicio: Date;
  fim: Date;
  // completo=false é só a prévia do primeiro clique (ainda escolhendo a
  // segunda data); completo=true é quando o período fecha (segundo clique).
  onSelecionar: (inicio: Date, fim: Date, completo: boolean) => void;
  // Pra uso como seletor de UMA data só (ex: data de um pagamento) — o
  // primeiro clique já fecha a seleção, sem esperar um segundo toque pra
  // formar um período.
  modoUnico?: boolean;
}) {
  const [anoVisivel, setAnoVisivel] = useState(inicio.getFullYear());
  const [mesVisivel, setMesVisivel] = useState(inicio.getMonth());
  // Enquanto null, um clique começa um período novo. Depois de começado,
  // guarda o primeiro dia clicado até o segundo clique fechar o período.
  const [inicioEmEscolha, setInicioEmEscolha] = useState<Date | null>(null);

  const hoje = new Date();
  const dias = gerarGrade(anoVisivel, mesVisivel);
  const nomeMes = new Date(anoVisivel, mesVisivel, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const inicioAtual = diaSemHora(inicioEmEscolha ?? inicio);
  const fimAtual = diaSemHora(inicioEmEscolha ?? fim);
  const eIntervalo = inicioAtual.getTime() !== fimAtual.getTime();

  function irPara(delta: number) {
    const data = new Date(anoVisivel, mesVisivel + delta, 1);
    setAnoVisivel(data.getFullYear());
    setMesVisivel(data.getMonth());
  }

  function aoClicarDia(dia: Date) {
    if (modoUnico) {
      onSelecionar(dia, dia, true);
      return;
    }
    if (inicioEmEscolha === null) {
      setInicioEmEscolha(dia);
      onSelecionar(dia, dia, false);
      return;
    }
    const novoInicio = dia < inicioEmEscolha ? dia : inicioEmEscolha;
    const novoFim = dia < inicioEmEscolha ? inicioEmEscolha : dia;
    setInicioEmEscolha(null);
    onSelecionar(novoInicio, novoFim, true);
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

      <p className="mini-calendar-hint">
        {modoUnico
          ? "Toque numa data para selecionar"
          : inicioEmEscolha === null
          ? "Toque numa data para começar um período"
          : "Toque na data final do período"}
      </p>

      <div className="mini-calendar-weekdays">
        {DIAS_SEMANA.map((dia) => (
          <span key={dia}>{dia}</span>
        ))}
      </div>

      <div className="mini-calendar-grid">
        {dias.map((dia) => {
          const foraDoMes = dia.getMonth() !== mesVisivel;
          const diaAtual = diaSemHora(dia);
          const ehInicio = diaAtual.getTime() === inicioAtual.getTime();
          const ehFim = diaAtual.getTime() === fimAtual.getTime();
          const ehMeio = eIntervalo && diaAtual > inicioAtual && diaAtual < fimAtual;
          const ehHoje = mesmoDia(dia, hoje);

          let classeExtra = "";
          if (ehInicio && ehFim) classeExtra = " mini-calendar-day-selecionado";
          else if (ehInicio) classeExtra = " mini-calendar-day-inicio";
          else if (ehFim) classeExtra = " mini-calendar-day-fim";
          else if (ehMeio) classeExtra = " mini-calendar-day-meio";
          else if (ehHoje) classeExtra = " mini-calendar-day-hoje";

          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => aoClicarDia(dia)}
              aria-current={ehInicio || ehFim ? "date" : undefined}
              className={"mini-calendar-day" + (foraDoMes ? " mini-calendar-day-fora" : "") + classeExtra}
            >
              {dia.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
