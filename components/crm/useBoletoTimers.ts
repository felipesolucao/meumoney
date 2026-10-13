'use client';
import { useEffect, useRef, useState } from 'react';
import type { Negociacao } from '../../lib/negociacoes';
import { segundosBoleto } from '../../lib/boletoTimer';

export default function useBoletoTimers(lista: Negociacao[]) {
  const [agora, setAgora] = useState(Date.now);
  const notificados = useRef(new Set<string>());
  useEffect(() => {
    function atualizar() {
      const instante = Date.now();
      setAgora(instante);
      for (const n of lista) {
        if (segundosBoleto(n, instante) !== 0) continue;
        const chave = `boleto-lembrete:${n.id}:${n.boletoLembreteEm}`;
        if (notificados.current.has(chave)) continue;
        try { if (localStorage.getItem(chave)) { notificados.current.add(chave); continue; } } catch { /* Armazenamento pode estar indisponível. */ }
        if (!('Notification' in window) || Notification.permission !== 'granted') continue;
        try {
          const aviso = new Notification('Hora de enviar o boleto', { body: `O prazo para enviar o novo boleto de ${n.empresa} terminou.`, tag: chave });
          aviso.onclick = () => { window.focus(); aviso.close(); };
          notificados.current.add(chave);
          try { localStorage.setItem(chave, '1'); } catch { /* A memória evita repetições nesta visita. */ }
        } catch { notificados.current.add(chave); /* O alerta na página permanece disponível. */ }
      }
    }
    atualizar();
    const timer = window.setInterval(atualizar, 1000);
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', atualizar); document.removeEventListener('visibilitychange', atualizar); };
  }, [lista]);
  return { agora, vencidos: lista.filter(n => segundosBoleto(n, agora) === 0) };
}
