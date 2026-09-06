// ============================================================================
// UTILITÁRIO: estilo dos cards de estatística (glow colorido)
// ----------------------------------------------------------------------------
// As classes .stat-card e .stat-icon (app/globals.css) leem as variáveis CSS
// customizadas --tone e --tone-subtle para colorir o "glow" de fundo e o
// selo do ícone com o tom certo (verde, âmbar, vermelho...) sem precisar de
// uma classe Tailwind fixa por cor — funciona igual nos temas claro e escuro.
//
// O TypeScript do React não tipa propriedades CSS customizadas por padrão,
// então este helper concentra o "as React.CSSProperties" num único lugar em
// vez de espalhar o cast em cada tela que usa um stat-card.
// ============================================================================
import type { CSSProperties } from "react";

export function tonCss(tone: string, toneSubtle?: string): CSSProperties {
  return {
    ["--tone" as string]: tone,
    ["--tone-subtle" as string]: toneSubtle ?? tone,
  } as CSSProperties;
}
