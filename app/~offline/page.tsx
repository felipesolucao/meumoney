// ============================================================================
// PÁGINA: Fallback offline (PWA)
// ----------------------------------------------------------------------------
// O service worker (public/sw.js, gerado a partir de next.config.js) serve
// ESTA página, direto do cache, sempre que uma navegação falha por falta de
// internet. Ela fica pré-cacheada no build automaticamente porque mora em
// "app/~offline" — essa é a convenção que o plugin @ducanh2912/next-pwa
// procura sozinho (ver next.config.js) pra saber qual é o documento de
// fallback, sem precisar apontar o caminho manualmente em nenhuma config.
//
// Por depender de login e de dados vindos da API, o resto do app não pode
// funcionar de verdade sem internet — então, em vez de tentar cachear telas
// com saldo/parcelas/contratos (que ficariam desatualizadas), a estratégia
// aqui é só: sem internet, mostrar este aviso; com internet, tudo volta a
// funcionar normalmente (ver a regra "NetworkOnly" pras páginas e pra API em
// next.config.js).
//
// Fica fora do middleware de autenticação (ver ROTAS_PUBLICAS em
// middleware.ts) só por segurança — na prática, quando está offline de
// verdade, o navegador nem chega a bater no servidor: o service worker
// intercepta a navegação e devolve esta página direto do cache.
// ============================================================================
"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="card max-w-sm w-full">
        <div
          className="mx-auto mb-5 flex items-center justify-center rounded-full"
          style={{ width: 64, height: 64, background: "var(--color-muted-bg)" }}
        >
          {/* Ícone de "sem conexão" — SVG inline, sem dependência de ícone externo */}
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 3L21 21M8.5 16.5C9.5 15.5 10.7 15 12 15C13.3 15 14.5 15.5 15.5 16.5M5.5 13C6.9 11.6 8.7 10.7 10.6 10.4M13.4 10.4C15.3 10.7 17.1 11.6 18.5 13M2 8.5C3.6 6.9 5.5 5.7 7.6 5M16.4 5C18.1 5.6 19.7 6.6 21 8M12 19.5H12.01"
              stroke="var(--color-muted)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold">Sem conexão com a internet</h1>
        <p className="text-muted text-sm mt-2 mb-6">
          O MeuMoney precisa de internet pra mostrar seus dados financeiros atualizados. Verifique sua
          conexão e tente novamente.
        </p>

        <button onClick={() => window.location.reload()} className="btn-primary">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
