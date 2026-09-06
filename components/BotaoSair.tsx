// ============================================================================
// COMPONENTE: Botão de sair (logout)
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowLeft } from "./Icons";

export default function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={sair}
      disabled={saindo}
      className="card flex items-center gap-3 w-full text-left text-error"
    >
      <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-error-subtle)" }}>
        <IconArrowLeft size={20} className="rotate-180" />
      </div>
      <p className="font-bold">{saindo ? "Saindo..." : "Sair da conta"}</p>
    </button>
  );
}
