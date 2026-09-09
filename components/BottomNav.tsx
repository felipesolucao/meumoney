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
// --- Visual: LIQUID GLASS (atualizado) --------------------------------------
// A barra virou um painel de "vidro líquido" escuro e translúcido (referência
// enviada pelo FR), em vez do .card branco/temático de antes:
//   - fundo com blur + saturação (backdrop-filter) e uma aresta de brilho no
//     topo, pra simular a borda de um vidro — ver ".liquid-glass-bar" em
//     globals.css
//   - halo verde suave "vazando" por baixo da barra (pseudo-elemento ::after
//     da mesma classe)
//   - o item ativo ganha uma cápsula de vidro mais clara por cima do vidro
//     escuro (".liquid-glass-item-ativo"), em vez do fundo verde-claro de
//     antes — igual ao "Home" destacado na referência
//   - como o vidro é sempre escuro (nos dois temas do app, claro e escuro),
//     ícone/rótulo usam cores próprias sempre claras (".text-glass-ativo" /
//     ".text-glass-muted"), não mais var(--color-primary)/var(--color-muted)
//     (que trocam de tom por tema e ficariam ilegíveis em cima do vidro)
//   - o botão central ganhou um contorno e um brilho superior sutis (mesmo
//     verde de sempre, var(--color-success)) pra combinar com o rim de vidro
//     da barra, sem perder o destaque de "ação principal"
//
// Ajustes visuais herdados (mantidos):
//   - barra com altura fixa (pedido explícito)
//   - o item da tela atual ganha um "selo" arredondado ao redor do ícone,
//     em vez de só mudar a cor do ícone
//   - o botão central "flutua" acima da barra (translateY negativo) e tem
//     sombra própria, para destacar como ação principal da tela
//   - o wrapper que limita a largura do pill (.bottom-nav-shell, ver
//     globals.css) não tem fundo — só o pill (.liquid-glass-bar) tem — pra
//     nenhuma cor sólida "vazar" atrás dele por cima dos cards ao rolar
//   - a margem inferior soma env(safe-area-inset-bottom) pra não ficar colado
//     (ou escondido atrás) do home indicator do iPhone
// ============================================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MenuLateralDrawer from "./MenuLateralDrawer";

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

// Todos os itens juntos (inclusive os dois lados do botão central), usados só
// para calcular qual aba deve acender — nunca renderizados diretamente daqui.
const TODOS_ITENS = [...ITENS, ...ITENS_DEPOIS_DO_BOTAO];

// ----------------------------------------------------------------------------
// BUG CORRIGIDO: "/financeiro/contas" acendia Transações E Contas ao mesmo
// tempo, porque a checagem antiga era só pathname.startsWith(item.href), e
// "/financeiro/contas" começa com "/financeiro" (o href de Transações).
// Correção: entre todos os itens cujo href é prefixo da rota atual, só o de
// href MAIS ESPECÍFICO (mais longo) acende — assim "/financeiro/contas" bate
// com os dois prefixos, mas só "Contas" (o mais específico) fica ativo.
// Funciona pra qualquer rota nova que apareça no futuro, sem precisar de caso
// especial pra cada sub-rota.
// ----------------------------------------------------------------------------
function itemEstaAtivo(item: (typeof ITENS)[number], pathname: string) {
  if (item.href === "/") return pathname === "/";

  const candidatos = TODOS_ITENS.filter((i) => i.href !== "/" && pathname.startsWith(i.href));
  if (candidatos.length === 0) return false;

  const maisEspecifico = candidatos.reduce((a, b) => (b.href.length > a.href.length ? b : a));
  return maisEspecifico.href === item.href;
}

export default function BottomNav({ ehAdmin }: { ehAdmin?: boolean }) {
  const pathname = usePathname();
  // "Menu" no mobile abre este painel deslizante em vez de navegar pra
  // /menu (ver MenuLateralDrawer.tsx) — pedido explícito de trocar a
  // página cheia por um menu lateral mais rápido de abrir/fechar.
  const [menuAberto, setMenuAberto] = useState(false);

  // Telas de autenticação e o painel de admin não usam o menu flutuante —
  // login/cadastro porque ainda não há sessão, e admin porque é uma área
  // separada do financeiro pessoal do usuário.
  if (pathname === "/login" || pathname === "/cadastro" || pathname.startsWith("/admin")) {
    return null;
  }

  function conteudoItem(item: (typeof ITENS)[number], ativo: boolean) {
    const Icon = item.icon;
    return (
      // A cápsula de vidro (.liquid-glass-item-ativo) só existe no item
      // ativo — é ela que faz o ícone atual parecer "circulado" em vidro
      // mais claro, como o "Home" na referência.
      <span
        className={`flex flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1 min-w-0 ${
          ativo ? "liquid-glass-item-ativo" : ""
        }`}
      >
        <Icon ativo={ativo} />
        <span
          className={`text-[9px] font-medium leading-none truncate ${
            ativo ? "text-glass-ativo" : "text-glass-muted"
          }`}
        >
          {item.label}
        </span>
      </span>
    );
  }

  function ItemNav(item: (typeof ITENS)[number]) {
    const ativo = itemEstaAtivo(item, pathname);

    if (item.href === "/menu") {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-haspopup="dialog"
          aria-expanded={menuAberto}
          className="flex-1 min-w-0 flex justify-center"
        >
          {conteudoItem(item, ativo)}
        </button>
      );
    }

    return (
      <Link key={item.href} href={item.href} className="flex-1 min-w-0 flex justify-center">
        {conteudoItem(item, ativo)}
      </Link>
    );
  }

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-50">
      <div className="bottom-nav-shell">
        <div
          className="pointer-events-auto mx-4 liquid-glass-bar flex items-center justify-between relative"
          style={{
            height: ALTURA_BARRA,
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
              // Mesmo verde de sempre (var(--color-success)), com um brilho
              // superior sutil pra combinar com o rim de vidro da barra.
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 45%), var(--color-success)",
              border: "1px solid rgba(255,255,255,0.35)",
              boxShadow: "var(--shadow-md), 0 1px 0 rgba(255,255,255,0.4) inset",
              transform: "translateY(-18px)",
            }}
          >
            <IconCifrao />
          </Link>

          {ITENS_DEPOIS_DO_BOTAO.map(ItemNav)}
        </div>
      </div>

      <MenuLateralDrawer aberto={menuAberto} onFechar={() => setMenuAberto(false)} ehAdmin={ehAdmin} />
    </nav>
  );
}

// ----------------------------------------------------------------------------
// Ícones simples em SVG inline (sem dependência externa de biblioteca de ícones)
// ----------------------------------------------------------------------------
// Devolve a classe de cor sobre o vidro — sempre clara nos dois temas, porque
// o fundo da barra (.liquid-glass-bar) é sempre escuro. Os traços do SVG
// usam currentColor, então a cor vem dessa classe.
function corIcone(ativo: boolean) {
  return ativo ? "text-glass-ativo" : "text-glass-muted";
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
