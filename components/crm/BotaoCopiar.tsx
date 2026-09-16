// ============================================================================
// COMPONENTE: Botão pequeno de copiar (nome/CNPJ da empresa)
// ----------------------------------------------------------------------------
// Usado ao lado do nome e do CNPJ, tanto no card do quadro (LeadCard) quanto
// no perfil do lead (LeadPainel/LeadPainelFormulario) — copia pro clipboard
// sem precisar selecionar o texto manualmente. Sempre para propagação do
// clique/pointerdown: sem isso, clicar aqui dentro de um card abriria o
// perfil do lead ou começaria um arraste (ver onPointerDownArrastar em
// LeadCard.tsx).
// ============================================================================
"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "../Icons";

export default function BotaoCopiar({ valor, rotulo }: { valor: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Clipboard indisponível (permissão negada, navegador antigo) — sem
      // feedback de sucesso, mas não quebra o resto da tela.
    }
  }

  return (
    <button
      type="button"
      className="crm-botao-copiar"
      onClick={copiar}
      onPointerDown={(e) => e.stopPropagation()}
      title={`Copiar ${rotulo}`}
      aria-label={`Copiar ${rotulo}`}
    >
      {copiado ? <IconCheck size={12} /> : <IconCopy size={12} />}
    </button>
  );
}
