// ============================================================================
// GLOBAL ERROR BOUNDARY — última rede de segurança
// ----------------------------------------------------------------------------
// O error.tsx normal só captura erros dentro do layout raiz (app/layout.tsx).
// Se o próprio layout raiz falhar ao renderizar, o Next.js usa ESTE arquivo
// no lugar — por isso ele precisa definir <html> e <body> do zero.
//
// Este é o último ponto antes da tela branca: se chegou a acionar este
// arquivo, é sinal de um erro grave (ex.: erro de configuração, variável de
// ambiente faltando, etc.) que vale a pena investigar com prioridade.
// ============================================================================
"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro crítico capturado pelo Global Error Boundary:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "sans-serif", background: "#f6faf7", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>
            Não foi possível carregar o app
          </h1>
          <p style={{ color: "#6B7280", fontSize: "0.875rem", marginBottom: "24px" }}>
            Ocorreu um erro crítico. Tente recarregar a página.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#2FA85A",
              color: "white",
              border: "none",
              borderRadius: "16px",
              padding: "14px 24px",
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
              maxWidth: "320px",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
