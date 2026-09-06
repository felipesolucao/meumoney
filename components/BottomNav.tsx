// ============================================================================
// COMPONENTE: Barra de navegação inferior
// ----------------------------------------------------------------------------
// Fixa na parte inferior da tela, com os 5 destinos principais do app,
// igual ao padrão visto em todas as telas de referência.
// ============================================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", label: "Início", icon: IconInicio },
  { href: "/financeiro", label: "Financeiro", icon: IconFinanceiro },
  { href: "/contratos", label: "Contratos", icon: IconContratos },
  { href: "/clientes", label: "Clientes", icon: IconClientes },
  { href: "/menu", label: "Menu", icon: IconMenu },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Telas de autenticação e o painel de admin não usam o menu flutuante —
  // login/cadastro porque ainda não há sessão, e admin porque é uma área
  // separada do financeiro pessoal do usuário.
  if (pathname === "/login" || pathname === "/cadastro" || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
      <div className="app-shell !min-h-0 !p-0 relative w-full">
        <div className="pointer-events-auto mx-4 mb-4 card flex items-center justify-between px-2 py-3">
          {ITENS.map((item) => {
            const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 flex-1"
              >
                <Icon ativo={ativo} />
                <span
                  className={`text-[11px] font-medium ${ativo ? "text-primary" : "text-muted"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// ----------------------------------------------------------------------------
// Ícones simples em SVG inline (sem dependência externa de biblioteca de ícones)
// ----------------------------------------------------------------------------
// Devolve a classe utilitaria de cor; os tracos do SVG usam currentColor,
// entao a cor vem do token (--color-primary / --color-muted) via Tailwind.
function corIcone(ativo: boolean) {
  return ativo ? "text-primary" : "text-muted";
}

function IconInicio({ ativo }: { ativo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <path d="M4 11.5L12 4l8 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFinanceiro({ ativo }: { ativo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5v9M9.5 9.8c0-1.1 1.1-2 2.5-2s2.5.7 2.5 1.8-1.1 1.6-2.5 1.9c-1.4.3-2.5.8-2.5 1.9s1.1 1.8 2.5 1.8 2.5-.9 2.5-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconContratos({ ativo }: { ativo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconClientes({ ativo }: { ativo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 14a5 5 0 015.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconRelatorios({ ativo }: { ativo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <path d="M5 20V10M12 20V4M19 20v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMenu({ ativo }: { ativo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
