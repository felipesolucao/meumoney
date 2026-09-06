// ============================================================================
// COMPONENTE: Provedor de tema (claro/escuro)
// ----------------------------------------------------------------------------
// Guarda a preferência de tema em localStorage ("meumoney-tema") e aplica o
// atributo data-theme="dark" (ou remove, para o claro) na tag <html>. Todo o
// resto do app não precisa saber disso: os componentes só leem var(--color-*)
// em app/globals.css, que já tem os dois conjuntos de valores.
//
// A leitura inicial acontece num <script> inline no <head> (ver app/layout.tsx)
// ANTES do React montar, pra tela nunca "piscar" claro e depois escurecer.
// Este provider só assume o controle depois disso, para os toques no switch
// (ThemeToggle.tsx) atualizarem a tela na hora.
// ============================================================================
"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Tema = "light" | "dark";

const CHAVE_STORAGE = "meumoney-tema";

const ThemeContext = createContext<{
  tema: Tema;
  alternarTema: () => void;
}>({
  tema: "light",
  alternarTema: () => {},
});

export function useTema() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // O valor inicial só importa para o primeiro render do React — a tela já
  // nasce correta porque o script inline no <head> já setou o atributo antes
  // disso. Aqui é só para o estado do switch (ThemeToggle) começar certo.
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    const atual = document.documentElement.getAttribute("data-theme");
    setTema(atual === "dark" ? "dark" : "light");
  }, []);

  function alternarTema() {
    setTema((atual) => {
      const novo: Tema = atual === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", novo);
      try {
        window.localStorage.setItem(CHAVE_STORAGE, novo);
      } catch {
        // localStorage indisponível (modo privado, etc.) — a troca ainda
        // funciona nesta sessão, só não persiste entre visitas.
      }
      return novo;
    });
  }

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>;
}

// ----------------------------------------------------------------------------
// Script inline (string) injetado no <head> por app/layout.tsx. Roda antes de
// qualquer pintura da página, então precisa ser JS puro, sem imports.
// ----------------------------------------------------------------------------
export const SCRIPT_TEMA_INICIAL = `
(function () {
  try {
    var salvo = window.localStorage.getItem("${CHAVE_STORAGE}");
    if (salvo === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch (e) {}
})();
`;
