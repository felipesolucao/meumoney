// ============================================================================
// COMPONENTE: Menu lateral (drawer), aberto pelo botão "Menu" do BottomNav
// ----------------------------------------------------------------------------
// Antes "Menu" no rodapé era um link pra página cheia /menu — no mobile,
// virou este painel deslizante (referência: print anexado pelo usuário),
// agrupado em "FERRAMENTAS" e "CONFIGURAÇÕES", cada item com ícone, rótulo
// e seta, igual ao padrão pedido. A página /menu continua existindo (link
// "Ver todas as opções" no rodapé do drawer, além de ser usada no menu
// lateral fixo do desktop).
// ============================================================================
"use client";

import Link from "next/link";
import { useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import BotaoSair from "./BotaoSair";
import {
  IconClose,
  IconChevronRight,
  IconCalendar,
  IconPlus,
  IconReceipt,
  IconWallet,
  IconTag,
  IconBuilding,
  IconChart,
  IconUser,
  IconUsers,
  IconDocument,
  IconChat,
} from "./Icons";

const FERRAMENTAS = [
  { href: "/contratos", icon: IconWallet, label: "Contratos" },
  { href: "/clientes", icon: IconUsers, label: "Clientes" },
  { href: "/parcelas", icon: IconCalendar, label: "Calendário" },
  { href: "/financeiro/novo", icon: IconPlus, label: "Novo lançamento" },
  { href: "/financeiro/pagar", icon: IconReceipt, label: "Contas a pagar" },
  { href: "/financeiro/receber", icon: IconWallet, label: "Contas a receber" },
  { href: "/financeiro/categorias", icon: IconTag, label: "Categorias" },
  { href: "/financeiro/contas", icon: IconBuilding, label: "Contas bancárias" },
  { href: "/financeiro/relatorios", icon: IconChart, label: "Relatório por categoria" },
];

const CONFIGURACOES = [
  { href: "/perfil", icon: IconUser, label: "Perfil" },
  { href: "/modelos-cobranca", icon: IconChat, label: "Modelos de cobrança" },
  { href: "/modelos-contrato", icon: IconDocument, label: "Modelos de contrato" },
  { href: "/contratos/novo", icon: IconDocument, label: "Novo contrato" },
];

export default function MenuLateralDrawer({ aberto, onFechar, ehAdmin }: { aberto: boolean; onFechar: () => void; ehAdmin?: boolean }) {
  // Trava o scroll do fundo enquanto o drawer está aberto — sem isso dava
  // pra rolar a página por trás junto com o painel.
  useEffect(() => {
    if (!aberto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[70] pointer-events-auto">
      {/* Fundo escurecido — toca fora do painel pra fechar. Some efeito de
          abertura junto com o painel (fadeIn). */}
      <button
        aria-label="Fechar menu"
        className="absolute inset-0 cursor-default animate-[fadeIn_0.2s_ease-out]"
        style={{ background: "rgb(var(--shadow-color) / 0.5)" }}
        onClick={onFechar}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="relative h-full w-[85%] max-w-[340px] bg-card shadow-overlay overflow-y-auto animate-[slideInLeft_0.22s_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="flex items-center justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3">
          <h2 className="text-lg font-bold">Menu</h2>
          <button type="button" onClick={onFechar} className="icon-btn" aria-label="Fechar">
            <IconClose size={18} />
          </button>
        </div>

        <nav className="px-3 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
          {ehAdmin && (
            <div className="mb-5">
              <Link
                href="/admin"
                onClick={onFechar}
                className="flex items-center gap-3 px-2 py-3 rounded-md active:bg-background"
                style={{ background: "var(--color-primary-surface)" }}
              >
                <span className="w-10 h-10 rounded-md bg-card flex items-center justify-center text-primary flex-shrink-0">
                  <IconUsers size={19} />
                </span>
                <span className="flex-1 font-semibold">Painel de administrador</span>
                <IconChevronRight size={16} className="text-muted flex-shrink-0" />
              </Link>
            </div>
          )}
          <GrupoMenu titulo="FERRAMENTAS" itens={FERRAMENTAS} onNavegar={onFechar} />
          <GrupoMenu titulo="CONFIGURAÇÕES" itens={CONFIGURACOES} onNavegar={onFechar} />

          <div className="px-2 mt-2 space-y-2">
            <ThemeToggle />
            <BotaoSair />
          </div>

          <Link
            href="/menu"
            onClick={onFechar}
            className="block text-center text-primary text-sm font-semibold mt-4 py-2"
          >
            Ver todas as opções
          </Link>
        </nav>
      </div>
    </div>
  );
}

function GrupoMenu({
  titulo,
  itens,
  onNavegar,
}: {
  titulo: string;
  itens: { href: string; icon: (props: { size?: number }) => JSX.Element; label: string }[];
  onNavegar: () => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold tracking-wide text-muted px-2 mb-2">{titulo}</p>
      <div>
        {itens.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavegar}
              className="flex items-center gap-3 px-2 py-3 rounded-md active:bg-background"
            >
              <span className="w-10 h-10 rounded-md bg-background flex items-center justify-center text-primary flex-shrink-0">
                <Icon size={19} />
              </span>
              <span className="flex-1 font-semibold">{item.label}</span>
              <IconChevronRight size={16} className="text-muted flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
