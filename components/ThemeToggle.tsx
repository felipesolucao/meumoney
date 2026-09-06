// ============================================================================
// COMPONENTE: Alternador de tema claro/escuro
// ----------------------------------------------------------------------------
// Reaproveita o mesmo "switch" (interruptor) já usado nos formulários do app
// (ver .switch em app/globals.css) — o mesmo estilo de toggle arredondado
// tipo Ionic/iOS pedido para trocar entre tema branco e preto. Sol à esquerda,
// lua à direita, e o card inteiro é clicável (não só a bolinha).
//
// Os ícones de sol/lua ficam aqui (e não em components/Icons.tsx) só porque
// esse arquivo já está no limite de linhas do projeto — mesmo padrão que o
// BottomNav.tsx já usa para seus próprios ícones locais.
// ============================================================================
"use client";

import { useTema } from "./ThemeProvider";

export default function ThemeToggle() {
  const { tema, alternarTema } = useTema();
  const escuro = tema === "dark";

  return (
    <button
      type="button"
      onClick={alternarTema}
      className="card flex items-center justify-between gap-3 w-full text-left"
      aria-pressed={escuro}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-muted-bg)", color: "var(--color-foreground)" }}
        >
          {escuro ? <IconLua /> : <IconSol />}
        </div>
        <div>
          <p className="font-bold">Tema escuro</p>
          <p className="text-sm text-muted">{escuro ? "Ativado" : "Desativado"} — preto e cinza</p>
        </div>
      </div>

      {/* Interruptor visual — o clique real é tratado pelo <button> pai */}
      <div className="switch" data-on={escuro} aria-hidden="true">
        <div className="switch-knob" />
      </div>
    </button>
  );
}

function IconSol() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLua() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 14.2A8.5 8.5 0 119.8 4a6.7 6.7 0 0010.2 10.2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
