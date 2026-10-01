// ============================================================================
// COMPONENTE: Barra superior de navegação do CRM (abas do produto)
// ----------------------------------------------------------------------------
// Navegação entre o funil e a gestão de negociações.
"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import IconKanban from "./IconKanban";
import { IconArrowLeft, IconUsers, IconChat, IconReceipt, IconChart, IconBell } from "../Icons";

type AbaNav = { label: string; Icone: ComponentType<{ size?: number }>; href?: string };

const ABAS: AbaNav[] = [
  { label: "Funil", Icone: IconKanban, href: "/crm" },
  { label: "Contatos", Icone: IconUsers },
  { label: "Chats", Icone: IconChat },
  { label: "Negociações", Icone: IconReceipt, href: "/crm/negociacoes" },
  { label: "Relatórios", Icone: IconChart },
];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
}

export default function CrmTopNav({
  nomeUsuario,
  quantidadeAlertas = 0,
  onAbrirAlertas,
}: {
  nomeUsuario?: string;
  quantidadeAlertas?: number;
  onAbrirAlertas?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="crm-nav">
      <div className="crm-nav-marca">
        <Link href="/" className="crm-nav-voltar" title="Voltar ao MeuMoney" aria-label="Voltar ao MeuMoney">
          <IconArrowLeft size={14} />
        </Link>
        <IconKanban size={17} />
        <span>CRM</span>
      </div>

      <nav className="crm-nav-abas" aria-label="Seções do CRM">
        {ABAS.map(({ label, Icone, href }) => href ? (
          <Link key={label} href={href} className={`crm-nav-aba${pathname === href ? " is-ativa" : ""}`} aria-current={pathname === href ? "page" : undefined}>
            <Icone size={15} />{label}
          </Link>
        ) : (
          <button key={label} type="button" className="crm-nav-aba" disabled title={`${label} — em breve`}><Icone size={15} />{label}</button>
        ))}
      </nav>

      <div className="crm-nav-acoes">
        {onAbrirAlertas && <button
          type="button"
          className="crm-nav-icone-btn crm-nav-alertas-btn"
          title="Abrir alertas"
          aria-label={`Abrir alertas${quantidadeAlertas ? ` (${quantidadeAlertas} pendentes)` : ""}`}
          onClick={onAbrirAlertas}
        >
          <IconBell size={17} />
          {quantidadeAlertas > 0 && <span className="crm-nav-alertas-badge">{quantidadeAlertas > 99 ? "99+" : quantidadeAlertas}</span>}
        </button>}
        {nomeUsuario && (
          <div className="crm-nav-avatar" title={nomeUsuario}>
            {iniciais(nomeUsuario)}
          </div>
        )}
      </div>
    </div>
  );
}
