// ============================================================================
// COMPONENTE: Seletor de mês (< Setembro 2026 >)
// ----------------------------------------------------------------------------
// Usado nas telas "Contas a pagar" e "Contas a receber" do Financeiro, para
// filtrar a lista pelo mês corrente por padrão, com navegação para meses
// anteriores/seguintes. Controlado pelo componente pai (mantém o estado do
// mês selecionado fora daqui, já que a página precisa refazer o fetch).
// ============================================================================
"use client";

import { IconChevronLeft, IconChevronRight } from "./Icons";

export default function MesSeletor({
  ano,
  mes, // 0-11, igual ao Date.getMonth()
  onMudar,
}: {
  ano: number;
  mes: number;
  onMudar: (novoAno: number, novoMes: number) => void;
}) {
  const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function irPara(delta: number) {
    const data = new Date(ano, mes + delta, 1);
    onMudar(data.getFullYear(), data.getMonth());
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => irPara(-1)}
        aria-label="Mês anterior"
        className="icon-btn text-foreground"
      >
        <IconChevronLeft size={18} />
      </button>
      <p className="font-bold capitalize text-lg">{nomeMes}</p>
      <button
        type="button"
        onClick={() => irPara(1)}
        aria-label="Próximo mês"
        className="icon-btn text-foreground"
      >
        <IconChevronRight size={18} />
      </button>
    </div>
  );
}
