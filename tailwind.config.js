/** ==========================================================================
 * TAILWIND CONFIG — paleta baseada no design de referência (Jurex Brasil)
 * ======================================================================== */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2FA85A",
          dark: "#1F7A40",
          light: "#E3F5E9",
        },
        ink: "#172033",
        muted: "#6B7280",
        amber: {
          bg: "#FDECC8",
          text: "#C98A1D",
        },
        danger: {
          DEFAULT: "#E4544A",
          bg: "#FBE4E2",
        },
        surface: "#F6FAF7",
      },
      borderRadius: {
        card: "22px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 8px 24px -12px rgba(23, 32, 51, 0.12)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
