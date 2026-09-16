// ============================================================================
// COMPONENTE: Atualização automática do service worker (PWA)
// ----------------------------------------------------------------------------
// Sem isso, um deploy novo só "aparece de verdade" na segunda vez que o
// usuário recarrega a página — a troca de service worker (mesmo com
// skipWaiting/clientsClaim, já ligados por padrão em next.config.js) é
// assíncrona, então o próprio recarregamento que dispara a atualização às
// vezes ainda é servido pelo worker antigo. Isso já causou confusão real:
// usuário via mudanças visuais (nova fonte, correção de bug) que já
// estavam no ar, mas continuava vendo a versão anterior mesmo depois de um
// hard refresh.
//
// A correção padrão pra esse problema de PWA: escutar o evento
// "controllerchange" (dispara quando um novo service worker assume o
// controle da página) e recarregar uma vez — só uma, pra nunca entrar em
// loop mesmo se o navegador disparar o evento mais de uma vez.
// ============================================================================
"use client";

import { useEffect } from "react";

export default function PwaAtualizador() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let jaRecarregou = false;
    function aoTrocarController() {
      if (jaRecarregou) return;
      jaRecarregou = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", aoTrocarController);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", aoTrocarController);
  }, []);

  return null;
}
