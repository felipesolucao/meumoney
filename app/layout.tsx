// ============================================================================
// LAYOUT RAIZ
// ----------------------------------------------------------------------------
// Envolve todas as páginas no "app-shell" (largura de app mobile) e adiciona
// a barra de navegação inferior fixa.
// ============================================================================
import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "../components/BottomNav";

export const metadata: Metadata = {
  title: "MeuMoney — Sua vida financeira sob controle",
  description: "Controle financeiro pessoal e empresarial: contas a pagar, a receber e gestão de empréstimos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        <div className="app-shell">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
