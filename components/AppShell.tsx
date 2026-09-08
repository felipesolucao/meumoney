"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { IconHome, IconDocument, IconUsers, IconChart, IconChevronDown } from "./Icons";
import logo from "../public/logo.png";

const itens = [
  { href: "/", label: "Início", icon: IconHome },
  { href: "/contratos", label: "Contratos", icon: IconDocument },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/relatorios", label: "Relatórios", icon: IconChart },
];

export default function AppShell({ children, nome }: { children: React.ReactNode; nome?: string }) {
  const pathname = usePathname();
  const semMenu = pathname === "/login" || pathname === "/cadastro" || pathname.startsWith("/admin");
  const contratos = pathname === "/contratos" || pathname.startsWith("/contratos/");

  return (
    <div className={semMenu ? "" : "desktop-layout"}>
      {!semMenu && (
        <aside className="desktop-sidebar">
          <Link href="/perfil" className="sidebar-brand">
            <Image src={logo} alt="" width={40} height={40} unoptimized />
            <span><strong>MeuMoney</strong><span className="sidebar-user">{nome || "Meu perfil"}</span></span>
          </Link>
          <nav aria-label="Menu principal" className="sidebar-nav">
            {itens.map(({ href, label, icon: Icon }) => {
              const ativo = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} className="sidebar-link" aria-current={ativo ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>;
            })}
            <details className="sidebar-settings">
              <summary className="sidebar-link"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinejoin="round" d="m9 3-.6 2.4-2 .9-2.2-.7-2 3.4 1.7 1.7v2.6L2.2 15l2 3.4 2.2-.7 2 .9L9 21h4l.6-2.4 2-.9 2.2.7 2-3.4-1.7-1.7v-2.6L19.8 9l-2-3.4-2.2.7-2-.9L13 3Z" /><circle cx="11" cy="12" r="3" /></svg><span>Configurações</span><IconChevronDown size={16} /></summary>
              <Link className="sidebar-link" href="/perfil">Meu perfil</Link>
              <Link className="sidebar-link" href="/modelos-cobranca">Modelos de cobrança</Link>
              <Link className="sidebar-link" href="/financeiro">Transações</Link>
              <Link className="sidebar-link" href="/financeiro/contas">Contas bancárias</Link>
              <Link className="sidebar-link" href="/menu">Todas as opções</Link>
            </details>
          </nav>
        </aside>
      )}
      <div className={`app-shell${contratos ? " contracts-shell" : ""}${pathname === "/" ? " home-shell" : ""}`}>{children}</div>
    </div>
  );
}
