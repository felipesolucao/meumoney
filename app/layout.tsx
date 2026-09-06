// ============================================================================
// LAYOUT RAIZ
// ----------------------------------------------------------------------------
// Envolve todas as páginas no "app-shell" (largura de app mobile) e adiciona
// a barra de navegação inferior fixa.
// ============================================================================
import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "../components/BottomNav";
import ToastProvider from "../components/ToastProvider";
import ThemeProvider, { SCRIPT_TEMA_INICIAL } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "MeuMoney — Sua vida financeira sob controle",
  description: "Controle financeiro pessoal e empresarial: contas a pagar, a receber e gestão de empréstimos",
};

// viewportFit: "cover" habilita env(safe-area-inset-*) no CSS — necessário
// pro menu flutuante inferior (BottomNav) respeitar a área do home indicator
// do iPhone em vez de ficar espremido/sobreposto ao conteúdo (ver globals.css).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
            <div className="app-shell">{children}</div>
            <BottomNav />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
