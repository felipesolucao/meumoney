// ============================================================================
// COMPONENTE: Barra de navegação inferior
// ----------------------------------------------------------------------------
// Fixa na parte inferior da tela, com os destinos principais do app.
//
// "Início" é a visão geral (saldo financeiro + saldo de empréstimos +
// movimentações + pendências, ver app/page.tsx). O painel de empréstimos
// (total emprestado/recebido/a receber, contratos ativos) é a aba
// "Empréstimos" (app/emprestimos/page.tsx) — de lá dá pra chegar em
// Contratos (atalho "Ver todos"/"Contratos"), por isso ele saiu daqui: com
// só 5 itens sobra mais espaço de toque pra cada ícone.
//
// Ajustes visuais:
//   - barra com altura fixa de 45px (pedido explícito)
//   - o item da tela atual ganha um "selo" arredondado ao redor do ícone,
//     em vez de só mudar a cor do ícone
//   - o wrapper que limita a largura do pill (.bottom-nav-shell, ver
//     globals.css) não tem fundo — só o pill (.card) tem — pra nenhuma cor
//     sólida "vazar" atrás dele por cima dos cards ao rolar a tela
//   - a margem inferior soma env(safe-area-inset-bottom) pra não ficar colado
//     (ou escondido atrás) do home indicator do iPhone
// ============================================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", label: "Início", icon: IconInicio },
  { href: "/emprestimos", label: "Empréstimos", icon: IconEmprestimos },
  { href: "/financeiro", label: "Financeiro", icon: IconFinanceiro },
  { href: "/clientes", label: "Clientes", icon: IconClientes },
  { href: "/menu", label: "Menu", icon: IconMenu },
];

// Altura fixa da barra, pedida explicitamente — os ícones e o texto abaixo
// encolhem um pouco (ver tamanhos no map abaixo) para caber confortavelmente.
const ALTURA_BARRA = 60;

export default function BottomNav() {
  const pathname = usePathname();

  // Telas de autenticação e o painel de admin não usam o menu flutuante —
  // login/cadastro porque ainda não há sessão, e admin porque é uma área
  // separada do financeiro pessoal do usuário.
  if (pathname === "/login" || pathname === "/cadastro" || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-50">
      <div className="bottom-nav-shell">
        <div
          className="pointer-events-auto mx-4 card flex items-center justify-between"
          style={{
            height: ALTURA_BARRA,
            // .card (globals.css) define "padding: 20px" nos 4 lados — o
            // inline style abaixo tem prioridade sobre essa classe e é o
            // jeito de manter a altura de 45px exata (padding menor, e só
            // nas laterais, sem sobra em cima/baixo).
            padding: "0 6px",
            marginBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {ITENS.map((item) => {
            const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex-1 min-w-0 flex justify-center">
                {/* O "selo" (fundo + borda arredondada) só existe no item ativo —
                    é ele que faz o ícone atual parecer "circulado", como pedido. */}
                <span
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1 min-w-0"
                  style={
                    ativo
                      ? { background: "var(--color-primary-subtle)" }
                      : undefined
                  }
                >
                  <Icon ativo={ativo} />
                  <span
                    className={`text-[9px] font-medium leading-none truncate ${ativo ? "text-primary" : "text-muted"}`}
                  >
                    {item.label}
                  </span>
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
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <path d="M4 11.5L12 4l8 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Ícone da aba "Empréstimos" — um selo de porcentagem, para diferenciar de
// "Financeiro" (a carteira) mesmo os dois lidando com dinheiro.
function IconEmprestimos({ ativo }: { ativo: boolean }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M9 15l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9.6" cy="9.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="14.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFinanceiro({ ativo }: { ativo: boolean }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5v9M9.5 9.8c0-1.1 1.1-2 2.5-2s2.5.7 2.5 1.8-1.1 1.6-2.5 1.9c-1.4.3-2.5.8-2.5 1.9s1.1 1.8 2.5 1.8 2.5-.9 2.5-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconClientes({ ativo }: { ativo: boolean }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 14a5 5 0 015.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMenu({ ativo }: { ativo: boolean }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
