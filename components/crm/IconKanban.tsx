// ============================================================================
// COMPONENTE: Ícone do CRM (três colunas de kanban)
// ----------------------------------------------------------------------------
// Fica fora de components/Icons.tsx (já no limite de tamanho do arquivo) —
// usado nos pontos de entrada para o CRM: menu lateral do desktop
// (AppShell), página /menu e o drawer de menu mobile.
// ============================================================================
export default function IconKanban({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="4" width="5.5" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9.25" y="4" width="5.5" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="15.5" y="4" width="5.5" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
