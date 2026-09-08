// ============================================================================
// LAYOUT RAIZ
// ----------------------------------------------------------------------------
// Envolve todas as páginas no "app-shell" (largura de app mobile) e adiciona
// a barra de navegação inferior fixa.
// ============================================================================
import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "../components/BottomNav";
import AppShell from "../components/AppShell";
import { obterSessao } from "../lib/auth";
import ToastProvider from "../components/ToastProvider";
import ThemeProvider, { SCRIPT_TEMA_INICIAL } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "MeuMoney — Sua vida financeira sob controle",
  description:
    "Controle suas finanças em um só lugar · Conecte suas contas e cartões · Planeje seus gastos e crie objetivos. Faça orçamentos mensais, controle suas receitas e gastos",
  applicationName: "MeuMoney",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "MeuMoney — Sua vida financeira sob controle",
    description:
      "Controle suas finanças em um só lugar · Conecte suas contas e cartões · Planeje seus gastos e crie objetivos. Faça orçamentos mensais, controle suas receitas e gastos",
    siteName: "MeuMoney",
    images: [
      {
        url: "https://raw.githubusercontent.com/felipesolucao/meumoney/main/public/logo.png",
        width: 1254,
        height: 1254,
        alt: "Logo do MeuMoney",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MeuMoney — Sua vida financeira sob controle",
    description:
      "Controle suas finanças em um só lugar · Conecte suas contas e cartões · Planeje seus gastos e crie objetivos. Faça orçamentos mensais, controle suas receitas e gastos",
    images: [
      {
        url: "https://raw.githubusercontent.com/felipesolucao/meumoney/main/public/logo.png",
        alt: "Logo do MeuMoney",
      },
    ],
  },
  // --------------------------------------------------------------------------
  // PWA / iOS ("Adicionar à Tela de Início")
  // ----------------------------------------------------------------------------
  // O manifest (app/manifest.ts) cobre Android/Chrome/desktop. Este bloco gera
  // as três meta tags que só o iOS/Safari entende, pra virar um app instalável
  // sem barra de navegador por lá também:
  //   <meta name="apple-mobile-web-app-capable" content="yes">
  //   <meta name="apple-mobile-web-app-status-bar-style" content="default">
  //   <meta name="apple-mobile-web-app-title" content="MeuMoney">
  // O apple-touch-icon em si vem sozinho do arquivo app/apple-icon.png
  // (convenção do Next.js — não precisa listar aqui).
  // --------------------------------------------------------------------------
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MeuMoney",
  },
};

// viewportFit: "cover" habilita env(safe-area-inset-*) no CSS — necessário
// pro menu flutuante inferior (BottomNav) respeitar a área do home indicator
// do iPhone em vez de ficar espremido/sobreposto ao conteúdo (ver globals.css).
//
// themeColor: pinta a barra de status/barra de endereço do navegador (e a
// moldura em volta do app quando instalado) na cor da marca. Mesmo valor do
// "theme_color" em app/manifest.ts — se trocar um, troque o outro junto.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1EAC60",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();
  return (
    <html lang="pt-BR">
      <head>
        {/* Aplica o tema salvo (claro/escuro) antes da primeira pintura da
            página, para nunca "piscar" claro e só depois escurecer. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_INICIAL }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <ToastProvider>
            <AppShell nome={sessao?.nome}>{children}</AppShell>
            <BottomNav />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
