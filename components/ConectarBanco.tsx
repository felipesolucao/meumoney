// ============================================================================
// Botão "Conectar meu banco" — abre o widget Pluggy Connect e, ao concluir,
// avisa o backend pra criar a Conta e sincronizar as transações desse banco.
// ============================================================================
"use client";
import { useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";

export function ConectarBanco({ aoConectar }: { aoConectar?: () => void }) {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function iniciar() {
    setCarregando(true);
    const res = await fetch("/api/pluggy/connect-token", { method: "POST" });
    const { connectToken } = await res.json();
    setConnectToken(connectToken);
    setCarregando(false);
  }

  if (!connectToken) {
    return (
      <button onClick={iniciar} disabled={carregando}>
        {carregando ? "Abrindo..." : "Conectar meu banco"}
      </button>
    );
  }

  return (
    <PluggyConnect
      connectToken={connectToken}
      includeSandbox={process.env.NODE_ENV !== "production"}
      onSuccess={async ({ item }: any) => {
        await fetch("/api/pluggy/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id }),
        });
        setConnectToken(null);
        aoConectar?.();
      }}
      onError={(erro: any) => console.error("Erro Pluggy Connect:", erro)}
      onClose={() => setConnectToken(null)}
    />
  );
}