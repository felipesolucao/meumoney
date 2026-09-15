// ============================================================================
// HOOK: useKanbanDrag — arrastar e soltar do quadro do CRM
// ----------------------------------------------------------------------------
// Toda a mecânica de Pointer Events (funciona com mouse e toque) fica isolada
// aqui, separada da renderização do quadro (ver CrmBoard.tsx): atualiza a
// lista de leads de forma otimista assim que o card é solto, e sincroniza
// com o servidor em segundo plano (1 PATCH quando muda de coluna + 1 ou 2
// POST /reordenar para fixar a posição de cada coluna afetada).
// ============================================================================
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { LeadCrmResumo } from "../../lib/crm";

export type DragState = {
  id: string;
  fromEstagio: string;
  width: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};

export type OverInfo = { estagio: string; index: number };

// Recalcula localmente as duas colunas afetadas por um arraste (origem e
// destino), já com a nova ordem sequencial.
function moverLead(leadsAtuais: LeadCrmResumo[], id: string, toEstagio: string, index: number) {
  const movido = leadsAtuais.find((l) => l.id === id);
  if (!movido) return null;
  const fromEstagio = movido.estagio;
  const resto = leadsAtuais.filter((l) => l.id !== id);

  const origemLista = resto.filter((l) => l.estagio === fromEstagio).sort((a, b) => a.ordem - b.ordem);
  const destinoBase = fromEstagio === toEstagio ? origemLista : resto.filter((l) => l.estagio === toEstagio).sort((a, b) => a.ordem - b.ordem);

  const destinoLista = [...destinoBase];
  const indiceSeguro = Math.max(0, Math.min(index, destinoLista.length));
  destinoLista.splice(indiceSeguro, 0, movido);

  return { fromEstagio, toEstagio, mudouEstagio: fromEstagio !== toEstagio, origemLista, destinoLista };
}

export function useKanbanDrag(
  leads: LeadCrmResumo[],
  setLeads: Dispatch<SetStateAction<LeadCrmResumo[]>>,
  onErro: (mensagem: string) => void,
) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overInfo, setOverInfo] = useState<OverInfo | null>(null);

  const leadsRef = useRef(leads);
  const overInfoRef = useRef<OverInfo | null>(null);
  const colBodyRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingRef = useRef<{ id: string; estagio: string; el: HTMLDivElement; offsetX: number; offsetY: number } | null>(null);
  const dragAtivoRef = useRef(false);

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  async function aplicarMovimentacao(id: string, toEstagio: string, index: number) {
    const resultado = moverLead(leadsRef.current, id, toEstagio, index);
    if (!resultado) return;
    const { fromEstagio, mudouEstagio, origemLista, destinoLista } = resultado;
    const agora = new Date().toISOString();

    const destinoAtualizada = destinoLista.map((l, i) => ({
      ...l,
      estagio: toEstagio,
      ordem: i,
      movimentadoEm: l.id === id && mudouEstagio ? agora : l.movimentadoEm,
    }));
    const origemAtualizada = mudouEstagio ? origemLista.map((l, i) => ({ ...l, ordem: i })) : [];

    const porId = new Map<string, LeadCrmResumo>();
    for (const l of [...destinoAtualizada, ...origemAtualizada]) porId.set(l.id, l);
    setLeads((prev) => prev.map((l) => porId.get(l.id) ?? l));

    try {
      if (mudouEstagio) {
        await fetch(`/api/crm/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estagio: toEstagio }),
        });
      }
      await fetch("/api/crm/leads/reordenar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estagio: toEstagio, idsNaOrdem: destinoAtualizada.map((l) => l.id) }),
      });
      if (mudouEstagio && origemAtualizada.length > 0) {
        await fetch("/api/crm/leads/reordenar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estagio: fromEstagio, idsNaOrdem: origemAtualizada.map((l) => l.id) }),
        });
      }
    } catch {
      onErro("A posição pode não ter sido salva — recarregue a página.");
    }
  }

  // Pointer events globais — registrados uma única vez; leem sempre o estado
  // mais recente via refs, então o efeito não precisa reagir a cada render.
  useEffect(() => {
    function calcularOverInfo(x: number, y: number, idArrastado: string): OverInfo | null {
      for (const [estagio, el] of colBodyRefs.current) {
        const rect = el.getBoundingClientRect();
        if (x < rect.left || x > rect.right) continue;
        const cartoes = Array.from(el.querySelectorAll<HTMLElement>("[data-lead-id]")).filter((c) => c.dataset.leadId !== idArrastado);
        let index = cartoes.length;
        for (let i = 0; i < cartoes.length; i++) {
          const cr = cartoes[i].getBoundingClientRect();
          if (y < cr.top + cr.height / 2) {
            index = i;
            break;
          }
        }
        return { estagio, index };
      }
      return null;
    }

    function onMove(e: PointerEvent) {
      const pendente = pendingRef.current;
      if (!pendente) return;

      if (!dragAtivoRef.current) {
        const inicio = pointerStartRef.current;
        // Limiar de 6px antes de considerar "arrastando" — deixa o clique
        // simples (sem mover o dedo/cursor) abrir o card normalmente.
        if (!inicio || Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 6) return;
        dragAtivoRef.current = true;
        const rect = pendente.el.getBoundingClientRect();
        setDrag({
          id: pendente.id,
          fromEstagio: pendente.estagio,
          width: rect.width,
          x: e.clientX - pendente.offsetX,
          y: e.clientY - pendente.offsetY,
          offsetX: pendente.offsetX,
          offsetY: pendente.offsetY,
        });
        return;
      }

      e.preventDefault();
      setDrag((atual) => (atual ? { ...atual, x: e.clientX - atual.offsetX, y: e.clientY - atual.offsetY } : atual));
      const info = calcularOverInfo(e.clientX, e.clientY, pendente.id);
      overInfoRef.current = info;
      setOverInfo(info);
    }

    function onUp() {
      const pendente = pendingRef.current;
      const foiArraste = dragAtivoRef.current;
      pendingRef.current = null;
      pointerStartRef.current = null;
      dragAtivoRef.current = false;
      setDrag(null);
      setOverInfo(null);
      if (!pendente || !foiArraste) return;

      const destino = overInfoRef.current ?? { estagio: pendente.estagio, index: 0 };
      overInfoRef.current = null;
      void aplicarMovimentacao(pendente.id, destino.estagio, destino.index);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function iniciarArraste(lead: LeadCrmResumo, e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    pendingRef.current = { id: lead.id, estagio: lead.estagio, el, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  }

  return { drag, overInfo, colBodyRefs, iniciarArraste };
}
