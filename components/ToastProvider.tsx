// ============================================================================
// COMPONENTE: Sistema de notificações (toast)
// ----------------------------------------------------------------------------
// Um <ToastProvider> envolve todo o app (ver app/layout.tsx) e expõe o hook
// useToast() para qualquer componente cliente mostrar uma mensagem flutuante
// de sucesso/erro no rodapé da tela, sem precisar de prop drilling.
//
// Como o Provider vive no layout raiz (acima de {children}), ele NÃO
// desmonta quando o usuário navega entre páginas — por isso dá pra chamar
// showToast() logo antes de um router.push() e a mensagem continua visível
// depois de trocar de tela (útil para "salvou e voltou para a lista").
// ============================================================================
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { IconCheck, IconAlert, IconClose } from "./Icons";

type TipoToast = "sucesso" | "erro";

type ToastState = { id: number; mensagem: string; tipo: TipoToast } | null;

const ToastContext = createContext<{ showToast: (mensagem: string, tipo?: TipoToast) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa ser usado dentro de <ToastProvider>");
  return ctx.showToast;
}

const DURACAO_MS = 3000;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((mensagem: string, tipo: TipoToast = "sucesso") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const id = Date.now();
    setToast({ id, mensagem, tipo });
    timeoutRef.current = setTimeout(() => {
      setToast((atual) => (atual?.id === id ? null : atual));
    }, DURACAO_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-50">
          <div className="app-shell !min-h-0 !p-0 relative w-full">
            <div
              className="pointer-events-auto mx-4 mb-28 rounded-2xl px-4 py-3.5 shadow-lg flex items-center gap-3"
              style={{
                background: toast.tipo === "sucesso" ? "#1F7A40" : "#c9433a",
                color: "white",
              }}
              role="status"
            >
              {toast.tipo === "sucesso" ? <IconCheck size={18} /> : <IconAlert size={18} />}
              <p className="text-sm font-semibold flex-1">{toast.mensagem}</p>
              <button
                onClick={() => setToast(null)}
                aria-label="Fechar"
                className="text-white/80 flex-shrink-0"
              >
                <IconClose size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
