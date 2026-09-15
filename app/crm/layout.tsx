// ============================================================================
// LAYOUT DO CRM — produto separado dentro do MeuMoney (ver app/crm/page.tsx)
// ----------------------------------------------------------------------------
// Só importa o CSS próprio do CRM (tema sempre escuro, independente do
// claro/escuro do resto do app — ver crm.css). O restante do "shell" (sem
// menu lateral/rodapé, largura cheia) já é resolvido em components/AppShell
// e na classe ".crm-shell" de app/globals.css.
// ============================================================================
import "./crm.css";

export const metadata = {
  title: "CRM — MeuMoney",
  description: "Quadro kanban de leads e oportunidades, separado do financeiro pessoal.",
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
