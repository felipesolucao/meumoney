// ============================================================================
// NEXT CONFIG + PWA (SERVICE WORKER)
// ----------------------------------------------------------------------------
// O suporte a PWA é adicionado pelo pacote @ducanh2912/next-pwa (continuação
// mantida do "next-pwa" original, compatível com Next 14 + App Router). Ele
// gera automaticamente, a cada `next build`, os arquivos public/sw.js e
// public/workbox-*.js — não edite esses arquivos gerados na mão, eles são
// recriados do zero em todo build.
//
// REGRA DE OURO deste app (financeiro, atrás de login): o service worker
// NUNCA deve guardar em cache nada de /api/**, nem o HTML das páginas — só os
// arquivos estáticos do build (JS/CSS/imagens/ícones), que não mudam por
// usuário nem por sessão. Ver o array "runtimeCaching" abaixo pra entender
// exatamente o que cada tipo de requisição faz.
//
// Isso também é o que torna o app "instalável" (critério de PWA do Chrome/
// Edge/Android): ter um manifest válido (app/manifest.ts) + um service worker
// registrado que responde ao evento "fetch" — mesmo que a estratégia dele,
// aqui, seja "sempre buscar da rede".
// ============================================================================
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",

  // Em desenvolvimento (`next dev`) o plugin já desliga sozinho o
  // precache/runtime-cache "de verdade" e usa um service worker mínimo
  // (NetworkOnly) — isso evita o clássico problema de "mudei o código mas o
  // navegador continua servindo a versão em cache". Deixamos explícito aqui
  // só pra documentar a intenção; o comportamento seria o mesmo sem esta
  // linha.
  disable: process.env.NODE_ENV === "development",

  // Registra o service worker sozinho (injeta o script de registro no app) —
  // não precisa adicionar isso manualmente em nenhum componente.
  register: true,

  // Quando existe uma versão nova do service worker esperando (usuário
  // deixou uma aba aberta enquanto um novo deploy saía), assume o controle
  // imediatamente (skipWaiting) e recarrega a aba sozinha quando a conexão
  // volta (reloadOnOnline) — assim o usuário nunca fica preso rodando uma
  // versão antiga do app.
  reloadOnOnline: true,

  // fallbacks: {} (vazio de propósito, e é opção de nível raiz — não vai
  // dentro de "workboxOptions") — o plugin detecta sozinho a pasta
  // "app/~offline" (ver app/~offline/page.tsx) e já sabe que essa é a página
  // pra servir, do cache, sempre que uma navegação falhar por falta de
  // internet. Não precisa apontar o caminho na mão aqui.
  fallbacks: {},

  workboxOptions: {
    runtimeCaching: [
      // 1) API — NUNCA cacheia. Toda chamada a /api/** (saldo, lançamentos,
      //    contratos, login, sincronização Pluggy etc.) busca sempre da rede.
      //    Sem internet, a chamada falha normalmente e o componente trata o
      //    erro como já faz hoje (ex.: mensagem "Falha de conexão").
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },

      // 2) Navegação entre páginas (carregar uma URL nova) e as buscas
      //    internas do App Router (RSC/prefetch, identificadas pelo header
      //    "RSC") — também sempre via rede, pelo mesmo motivo: o HTML/dado
      //    de cada tela é gerado na hora, específico do usuário logado.
      //    Se a rede falhar aqui (offline de verdade), é ESSA regra que
      //    aciona o fallback do item 1) acima — o plugin intercepta o erro
      //    e devolve app/~offline/page.tsx sozinho.
      {
        urlPattern: ({ request, sameOrigin }) =>
          sameOrigin && (request.mode === "navigate" || request.headers.get("RSC") === "1"),
        handler: "NetworkOnly",
      },

      // 3) Imagens (ícones, logo, capturas) — StaleWhileRevalidate: mostra a
      //    versão em cache na hora (tela não fica esperando) e atualiza o
      //    cache em segundo plano pra próxima vez. Seguro pra imagens porque
      //    elas não carregam dado financeiro nenhum.
      {
        urlPattern: /\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "meumoney-imagens",
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 dias
        },
      },

      // 4) JS/CSS gerados pelo build (pasta /_next/static) — o nome de cada
      //    arquivo já muda a cada deploy (leva um hash do conteúdo), então
      //    pode ficar em cache por muito tempo sem risco: um deploy novo
      //    automaticamente pede arquivos com nomes novos, nunca reaproveita
      //    um arquivo velho do cache por engano.
      {
        urlPattern: /\/_next\/static\/.+/i,
        handler: "CacheFirst",
        options: {
          cacheName: "meumoney-build-estatico",
          expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 ano
        },
      },

      // 5) Fontes e outros arquivos estáticos "soltos" (não numerados acima)
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|css|js)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "meumoney-recursos-diversos",
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 dias
        },
      },

      // 6) Pega-tudo final: qualquer requisição que não bateu em nenhuma
      //    regra acima (ex.: algo de terceiro imprevisto) nunca é guardada
      //    em cache — sempre busca da rede. Opção mais segura como padrão.
      {
        urlPattern: /.*/i,
        handler: "NetworkOnly",
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 14 lint integration does not understand ESLint 9 flat config: during
  // a build it falls through to the interactive "configure ESLint" prompt.
  // Linting runs from its own script instead -- `npm run lint`.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = withPWA(nextConfig);
