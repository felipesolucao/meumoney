// ============================================================================
// ERROR BOUNDARY — captura erros não tratados em qualquer página
// ----------------------------------------------------------------------------
// O Next.js App Router usa este arquivo automaticamente sempre que um erro
// não tratado acontece durante a renderização de uma página (ou de algo que
// ela chama). Sem este arquivo, um erro assim resulta em TELA BRANCA em
// produção — o React desmonta a árvore inteira e não sobra nada visível.
//
// Este componente é o que garante que, a partir de agora, o usuário sempre
// vê uma mensagem de erro com um botão para tentar de novo, em vez de uma
// tela em branco sem explicação.
// ============================================================================
"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Loga o erro no console do navegador para facilitar o diagnóstico.
    // Se no futuro você adicionar um serviço de monitoramento (Sentry, etc.),
    // é aqui que se envia o erro para lá.
    console.error("Erro não tratado capturado pelo Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-danger-bg flex items-center justify-center mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      <h1 className="text-xl font-bold mb-2">Algo deu errado</h1>
      <p className="text-muted text-sm mb-6">
        Ocorreu um erro inesperado ao carregar esta tela. Você pode tentar novamente ou voltar para o início.
      </p>

      <div className="w-full space-y-3">
        <button onClick={() => reset()} className="btn-primary w-full">
          Tentar novamente
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 font-semibold"
        >
          Voltar para o início
        </button>
      </div>

      {process.env.NODE_ENV !== "production" && (
        <pre className="mt-6 text-left text-xs bg-gray-100 rounded-lg p-3 w-full overflow-auto text-red-600">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      )}
    </div>
  );
}
