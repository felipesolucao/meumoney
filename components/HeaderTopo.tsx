// ============================================================================
// COMPONENTE: Cabeçalho do topo (usado na tela Início)
// ----------------------------------------------------------------------------
// "Olá, {primeiro nome}" à esquerda; à direita, nessa ordem: alternar tema
// claro/escuro, sino de notificações (decorativo por enquanto — não existe
// central de notificações no app ainda) e a bolinha com a inicial do nome,
// que leva para /perfil.
//
// Precisa ser "use client" só por causa do useTema() (o botão de tema muda
// o atributo data-theme na hora, sem recarregar a página) — por isso recebe
// o nome já pronto via prop, em vez de ler a sessão aqui dentro.
//
// Ícones de sol/lua ficam aqui (não em components/Icons.tsx) pelo mesmo
// motivo do ThemeToggle.tsx: uso local, arquivo de ícones já grande.
// ============================================================================
"use client";

import Link from "next/link";
import { useTema } from "./ThemeProvider";
import { IconBell } from "./Icons";

export default function HeaderTopo({ nome }: { nome: string }) {
  const { tema, alternarTema } = useTema();
  const escuro = tema === "dark";
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Usuário";
  const inicial = primeiroNome.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-muted text-sm">Olá,</p>
        <h1 className="text-2xl font-bold truncate">{primeiroNome}</h1>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={alternarTema}
          className="icon-btn text-foreground"
          aria-label="Alternar tema claro/escuro"
          aria-pressed={escuro}
        >
          {escuro ? <IconLua /> : <IconSol />}
        </button>

        <div className="icon-btn text-foreground" aria-label="Notificações">
          <IconBell size={19} />
        </div>

        <Link
          href="/perfil"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ background: "var(--gradient-avatar)" }}
          aria-label="Ir para o perfil"
        >
          {inicial}
        </Link>
      </div>
    </div>
  );
}

function IconSol() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 14.2A8.5 8.5 0 119.8 4a6.7 6.7 0 0010.2 10.2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
