// ============================================================================
// COMPONENTE: Barra de navegação inferior
// ----------------------------------------------------------------------------
// 4 abas (Início, Transações, Contas, Menu) + um botão flutuante verde no
// meio, com o cifrão ($), que abre direto a tela de nova transação
// (/financeiro/novo). "Empréstimos" e "Clientes" saíram do rodapé para não
// disputar espaço com o botão central — continuam acessíveis pelo Menu
// (ver app/menu/page.tsx).
//
// "Transações" é a antiga aba "Financeiro" só com o rótulo trocado — a rota
// continua sendo /financeiro, então nenhum link existente quebra.
//
// Ajustes visuais:
//   - barra com altura fixa (pedido explícito)
//   - o item da tela atual ganha um "selo" arredondado ao redor do ícone,
//     em vez de só mudar a cor do ícone
//   - o botão central "flutua" acima da barra (translateY negativo) e tem
//     sombra própria, para destacar como ação principal da tela
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
  { href: "/financeiro", label: "Transações", icon: IconTransacoes },
];

const ITENS_DEPOIS_DO_BOTAO = [
  { href: "/financeiro/contas", label: "Contas", icon: IconContas },
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

  function ItemNav(item: (typeof ITENS)[number]) {
    const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} className="flex-1 min-w-0 flex justify-center">
        {/* O "selo" (fundo + borda arredondada) só existe no item ativo —
            é ele que faz o ícone atual parecer "circulado", como pedido. */}
        <span
          className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1 min-w-0"
          style={ativo ? { background: "var(--color-primary-subtle)" } : undefined}
        >
          <Icon ativo={ativo} />
          <span className={`text-[9px] font-medium leading-none truncate ${ativo ? "text-primary" : "text-muted"}`}>
            {item.label}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-50">
      <div className="bottom-nav-shell">
        <div
          className="pointer-events-auto mx-4 card flex items-center justify-between relative"
          style={{
            height: ALTURA_BARRA,
            // .card (globals.css) define "padding: 20px" nos 4 lados — o
            // inline style abaixo tem prioridade sobre essa classe e é o
            // jeito de manter a altura exata (padding menor, e só nas
            // laterais, sem sobra em cima/baixo).
            padding: "0 6px",
            marginBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {ITENS.map(ItemNav)}

          {/* --- Botão central: nova transação --------------------------------- */}
          <Link
            href="/financeiro/novo"
            aria-label="Nova transação"
            className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white"
            style={{
              background: "var(--color-success)",
              boxShadow: "var(--shadow-md)",
              transform: "translateY(-18px)",
            }}
          >
            <IconCifrao />
          </Link>

          {ITENS_DEPOIS_DO_BOTAO.map(ItemNav)}
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

// Ícone da aba "Transações" (antes "Financeiro") — um cifrão dentro de um
// círculo, mesmo desenho de antes, só o nome da função que mudou.
function IconTransacoes({ ativo }: { ativo: boolean }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5v9M9.5 9.8c0-1.1 1.1-2 2.5-2s2.5.7 2.5 1.8-1.1 1.6-2.5 1.9c-1.4.3-2.5.8-2.5 1.9s1.1 1.8 2.5 1.8 2.5-.9 2.5-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Ícone da aba "Contas" — um "prédio"/banco, para diferenciar do cifrão de
// Transações mesmo os dois lidando com dinheiro.
function IconContas({ ativo }: { ativo: boolean }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className={corIcone(ativo)}>
      <path d="M4 10l8-5.5L20 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v8.5h14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 18.5V13h5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

// Cifrão branco do botão central — sem variante "ativo" porque o botão nunca
// fica "selecionado" (ele só abre a tela de nova transação e some da rota).
function IconCifrao() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.8 4.5 3.3 4.5 1.6 4.5 3.2-2 3-4.5 3-4.5-1.3-4.5-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
