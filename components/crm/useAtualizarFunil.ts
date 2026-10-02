'use client';
import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { LeadCrmResumo } from '../../lib/crm';

export function useAtualizarFunil(iniciais: LeadCrmResumo[], setLeads: Dispatch<SetStateAction<LeadCrmResumo[]>>, editando: boolean) {
  useEffect(() => { setLeads(iniciais); }, [iniciais, setLeads]);
  useEffect(() => {
    if (editando) return;
    const controller = new AbortController();
    async function atualizarAoVoltar() {
      if (document.visibilityState !== 'visible') return;
      try {
        const resposta = await fetch('/api/crm/leads', { cache: 'no-store', signal: controller.signal });
        if (resposta.ok) {
          const lista: LeadCrmResumo[] = await resposta.json();
          if (!controller.signal.aborted) setLeads(lista);
        }
      } catch { /* Preserva o quadro atual se a conexão falhar. */ }
    }
    window.addEventListener('focus', atualizarAoVoltar);
    document.addEventListener('visibilitychange', atualizarAoVoltar);
    return () => {
      controller.abort();
      window.removeEventListener('focus', atualizarAoVoltar);
      document.removeEventListener('visibilitychange', atualizarAoVoltar);
    };
  }, [editando, setLeads]);
}
