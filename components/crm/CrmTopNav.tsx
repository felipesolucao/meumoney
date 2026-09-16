// ============================================================================
// COMPONENTE: Barra superior de navegação do CRM (abas do produto)
// ----------------------------------------------------------------------------
// Hoje só "Funil" existe de verdade (o quadro Kanban). As outras abas ficam
// visíveis mas desativadas ("em breve") — são o lugar reservado pras
// próximas páginas do CRM (Contatos, Chats, Negócios, Relatórios etc.),
// pedido explícito pra já nascerem no mesmo padrão visual.
// ============================================================================
"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import IconKanban from "./IconKanban";
import { IconArrowLeft, IconUsers, IconChat, IconReceipt, IconChart, IconBell } from "../Icons";

type AbaNav = { label: string; Icone: ComponentType<{ size?: number }>; ativa?: boolean };

const ABAS: AbaNav[] = [
  { label: "Funil", Icone: IconKanban, ativa: true },
  { label: "Contatos", Icone: IconUsers },
  { label: "Chats", Icone: IconChat },
  { label: "Negócios", Icone: IconReceipt },
  { label: "Relatórios", Icone: IconChart },
];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
}

export default function CrmTopNav({ nomeUsuario }: { nomeUsuario?: string }) {
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
        {ABAS.map(({ label, Icone, ativa }) => (
          <button
            key={label}
            type="button"
            className={`crm-nav-aba${ativa ? " is-ativa" : ""}`}
            disabled={!ativa}
            title={ativa ? undefined : `${label} — em breve`}
          >
            <Icone size={15} />
            {label}
          </button>
        ))}
      </nav>

      <div className="crm-nav-acoes">
        <button type="button" className="crm-nav-icone-btn" title="Notificações — em breve" disabled>
          <IconBell size={17} />
        </button>
        {nomeUsuario && (
          <div className="crm-nav-avatar" title={nomeUsuario}>
            {iniciais(nomeUsuario)}
          </div>
        )}
      </div>
    </div>
  );
}
