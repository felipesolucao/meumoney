// ============================================================================
// CONTEXTO: Carteira selecionada na Início
// ----------------------------------------------------------------------------
// A Início mistura seções server-rendered (RECEBÍVEIS E PENDÊNCIAS) com
// seções client-side (CarteirasInicio, DespesasPorCategoriaInicio,
// MovimentacoesRecentesInicio) espalhadas pela página em app/page.tsx. Sem
// um estado compartilhado, cada uma teria seu próprio "qual carteira está
// selecionada" — e foi exatamente esse o bug relatado: trocar de carteira
// no seletor da CarteirasInicio não refletia nas despesas por categoria nem
// nas movimentações recentes, que continuavam mostrando dados de TODAS as
// carteiras (vazando informação de contas que não são da carteira escolhida).
//
// Este Context resolve isso: CarteirasInicio publica a carteira escolhida
// aqui, e qualquer outro componente client da árvore (não precisa ser filho
// direto) lê o mesmo valor com useCarteiraSelecionada().
// ============================================================================
"use client";

import { createContext, useContext, useState } from "react";

type CarteiraContextValue = {
  carteiraId: string | null;
  setCarteiraId: (id: string | null) => void;
};

const CarteiraContext = createContext<CarteiraContextValue | null>(null);

export function CarteiraProvider({ children }: { children: React.ReactNode }) {
  const [carteiraId, setCarteiraId] = useState<string | null>(null);
  return <CarteiraContext.Provider value={{ carteiraId, setCarteiraId }}>{children}</CarteiraContext.Provider>;
}

export function useCarteiraSelecionada() {
  const contexto = useContext(CarteiraContext);
  if (!contexto) throw new Error("useCarteiraSelecionada precisa estar dentro de <CarteiraProvider>");
  return contexto;
}
