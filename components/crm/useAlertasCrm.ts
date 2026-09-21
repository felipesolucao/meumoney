"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlertaCrmResumo } from "../../lib/crm";

export function useAlertasCrm() {
  const [alertas, setAlertas] = useState<AlertaCrmResumo[]>([]);
  const [modalAlertas, setModalAlertas] = useState(false);

  const carregarAlertas = useCallback(async () => {
    try {
      const resposta = await fetch("/api/crm/alertas");
      if (resposta.ok) setAlertas(await resposta.json());
    } catch {
      // Uma nova tentativa ocorre no próximo intervalo ou clique no sino.
    }
  }, []);

  useEffect(() => {
    carregarAlertas();
    const intervalo = window.setInterval(carregarAlertas, 60_000);
    window.addEventListener("crm-alertas-atualizar", carregarAlertas);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("crm-alertas-atualizar", carregarAlertas);
    };
  }, [carregarAlertas]);

  function abrirAlertas() {
    carregarAlertas();
    setModalAlertas(true);
  }

  return { alertas, setAlertas, modalAlertas, setModalAlertas, abrirAlertas };
}
