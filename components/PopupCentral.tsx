"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./PopupCentral.module.css";

export default function PopupCentral({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const elemento = dialog.current;
    const foco = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    elemento?.showModal();
    document.body.style.overflow = "hidden";
    return () => { elemento?.close(); document.body.style.overflow = overflow; foco?.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby="titulo-popup-central"
    onCancel={(event) => { event.preventDefault(); onFechar(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onFechar(); }}>
    <div className={styles.content}>
      <header className={styles.header}><h2 id="titulo-popup-central" className="text-lg font-bold">{titulo}</h2><button type="button" onClick={onFechar} aria-label="Fechar popup" className="icon-btn">×</button></header>
      {children}
    </div>
  </dialog>, document.body);
}
