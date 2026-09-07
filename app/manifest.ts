// ============================================================================
// WEB APP MANIFEST (PWA)
// ----------------------------------------------------------------------------
// Convenção nativa do Next.js App Router: este arquivo gera automaticamente a
// rota /manifest.webmanifest e o Next já injeta a tag <link rel="manifest">
// no <head> sozinho — não precisa adicionar nada manualmente no layout.
//
// Pra trocar nome, descrição, cor do tema ou cor de fundo do app instalado,
// edite só os valores abaixo.
// ============================================================================
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meu Money",
    short_name: "MeuMoney",
    description: "Controle Financeiro e Emprestimos",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#1EAC60",
    background_color: "#F9FAFB",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Ícone "maskable": versão com margem de segurança, usada pelo Android
      // quando aplica máscaras de forma (círculo, squircle...) no ícone
      // instalado, pra não cortar o logo/texto.
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
