/** ==========================================================================
 * TAILWIND CONFIG — espelho dos design tokens
 * --------------------------------------------------------------------------
 * Nenhum valor de cor, fonte, raio ou sombra é escrito aqui: tudo aponta para
 * as variáveis CSS declaradas em app/globals.css (:root). Este arquivo só dá
 * nome de classe utilitária a cada token.
 *
 * Para trocar uma cor, edite app/globals.css. Mexa aqui só para criar ou
 * renomear um token.
 *
 * Atenção: cores vindas de var() não aceitam o modificador de opacidade do
 * Tailwind (bg-primary/50 não funciona). Onde é preciso transparência, use
 * as cores nativas do Tailwind (bg-white/60) ou um token próprio.
 * ======================================================================== */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- base ---
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        card: "var(--color-card)",

        // --- marca ---
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          dark: "var(--color-primary-dark)",
          subtle: "var(--color-primary-subtle)",
          surface: "var(--color-primary-surface)",
          border: "var(--color-primary-border)",
          tint: "var(--color-primary-tint)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          hover: "var(--color-secondary-hover)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
          strong: "var(--color-accent-strong)",
          border: "var(--color-accent-border)",
        },

        // --- neutros ---
        muted: {
          DEFAULT: "var(--color-muted)",
          bg: "var(--color-muted-bg)",
          surface: "var(--color-muted-surface)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
          error: "var(--color-border-error)",
        },

        // --- estado ---
        success: {
          DEFAULT: "var(--color-success)",
          hover: "var(--color-success-hover)",
          subtle: "var(--color-success-subtle)",
          strong: "var(--color-success-strong)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          hover: "var(--color-warning-hover)",
          subtle: "var(--color-warning-subtle)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          hover: "var(--color-error-hover)",
          subtle: "var(--color-error-subtle)",
          strong: "var(--color-error-strong)",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-error": "var(--gradient-error)",
        "gradient-avatar": "var(--gradient-avatar)",
        "gradient-header": "var(--gradient-header)",
        "gradient-surface": "var(--gradient-surface)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        tile: "var(--radius-tile)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        tile: "var(--shadow-tile)",
        overlay: "var(--shadow-overlay)",
        primary: "var(--shadow-primary)",
        error: "var(--shadow-error)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        heading: "var(--font-heading)",
      },
      spacing: {
        card: "var(--space-card)",
        "list-gap": "var(--space-list-gap)",
      },
      maxWidth: {
        shell: "var(--shell-max-width)",
      },
    },
  },
  plugins: [],
};
