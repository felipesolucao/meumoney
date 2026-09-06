// ============================================================================
// COMPONENTE: Card de saldo com fundo decorativo e botão de ocultar valor
// ----------------------------------------------------------------------------
// Usado no card grande de "Total emprestado" (Início) e "Balanço do mês"
// (Financeiro). Envolve o valor em destaque com:
//   - um padrão de linhas onduladas no fundo (só decoração, sem interação)
//   - um ícone de olho que oculta/mostra o valor (útil pra não expor o saldo
//     na tela quando alguém está por perto)
// O estado de oculto fica só em memória (React state) — some ao recarregar
// a página, então a informação nunca "vaza" persistida em disco.
// ============================================================================
"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "./Icons";

export default function CardSaldo({
  label,
  valor,
  corValor = "inherit",
  children,
}: {
  label: string;
  valor: string;
  corValor?: string;
  children?: React.ReactNode;
}) {
  const [oculto, setOculto] = useState(false);

  return (
    <div className="rounded-card p-5 relative overflow-hidden" style={{ background: "linear-gradient(160deg,#eafaf0,#f6faf7)" }}>
      {/* Padrão decorativo — linhas onduladas sutis no canto do card */}
      <svg
        className="absolute -top-2 -right-6 pointer-events-none"
        width="180"
        height="140"
        viewBox="0 0 180 140"
        fill="none"
        aria-hidden="true"
      >
        <path d="M-10 40C20 20 40 60 70 40S120 20 150 40s40 20 60 0" stroke="#2FA85A" strokeOpacity="0.12" strokeWidth="2" />
        <path d="M-10 70C20 50 40 90 70 70S120 50 150 70s40 20 60 0" stroke="#2FA85A" strokeOpacity="0.1" strokeWidth="2" />
        <path d="M-10 100C20 80 40 120 70 100S120 80 150 100s40 20 60 0" stroke="#2FA85A" strokeOpacity="0.08" strokeWidth="2" />
      </svg>

      <div className="relative flex items-start justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted">{label}</p>
        <button
          type="button"
          onClick={() => setOculto((v) => !v)}
          aria-label={oculto ? "Mostrar valor" : "Ocultar valor"}
          className="text-muted"
        >
          {oculto ? <IconEyeOff size={19} /> : <IconEye size={19} />}
        </button>
      </div>

      <p className="text-4xl font-extrabold mt-1 relative" style={{ color: corValor }}>
        {oculto ? "R$ ••••••" : valor}
      </p>

      {children}
    </div>
  );
}
