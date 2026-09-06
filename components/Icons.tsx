// ============================================================================
// COMPONENTE: Biblioteca de ícones do app
// ----------------------------------------------------------------------------
// Ícones em SVG (stroke, sem preenchimento) — o mesmo estilo já usado no
// BottomNav — para substituir os emojis usados nas telas e deixar o visual
// mais "clean" e consistente entre todas as páginas.
//
// Todos aceitam "size" (padrão 20) e "className" (para cor via text-*, ex:
// className="text-primary" já que os traços usam stroke="currentColor").
// ============================================================================

type IconProps = { size?: number; className?: string; strokeWidth?: number };

function base(size: number) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const };
}

export function IconArrowLeft({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronRight({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBell({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 10a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18.5a2 2 0 004 0" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconHome({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 11.5L12 4l8 7.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDocument({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconReceipt({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 3h12v17l-2.5-1.5L13 20l-2.5-1.5L8 20l-2-1.5V3z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconUsers({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M15.5 14a5 5 0 015.5 5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconUser({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconChart({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 20V10M12 20V4M19 20v-7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconHelp({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M9.5 9.3a2.5 2.5 0 014.9.7c0 1.7-2.4 2-2.4 3.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPlus({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconWallet({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M4 9V6.5A1.5 1.5 0 015.5 5H16" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="16.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrendUp({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 16l6-6 4 4 6-7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h5v5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrendDown({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 8l6 6 4-4 6 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 17h5v-5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEye({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function IconEyeOff({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M6.4 6.6C4 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1.1M9.9 5.7c.7-.15 1.4-.2 2.1-.2 6 0 9.5 6.5 9.5 6.5s-.7 1.3-2 2.8" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 12a2.1 2.1 0 002.9 2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-1 13a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7h12z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M20 11a8 8 0 00-14.9-3.5M4 4v4h4M4 13a8 8 0 0014.9 3.5M20 20v-4h-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSend({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 12l16-8-6 16-3-6-7-2z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChat({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 5h16v11H9l-4 3v-3H4z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCash({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function IconCheck({ size = 20, className, strokeWidth = 2.2 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUndo({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 7L4 12l5 5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12h10a6 6 0 016 6v0" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBuilding({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="6" y="3" width="12" height="18" rx="1" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M9 7h1.5M13.5 7H15M9 11h1.5M13.5 11H15M9 15h1.5M13.5 15H15" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M10 21v-3.5a2 2 0 014 0V21" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconRepeat({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M17 2l4 4-4 4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12v-2a4 4 0 014-4h14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 22l-4-4 4-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlert({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3.5l9.5 16.5H2.5L12 3.5z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCalendar({ size = 20, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="4" y="5.5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
