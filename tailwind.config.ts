import type { Config } from "tailwindcss";

// Bonétat design tokens — "Bleu de Sidi Bou Saïd, fleur de bougainvillier"
// Blue carries trust (actions, product stage). Pink is for "new" and attention.
// Green is reserved for money saved. Everything else is chalk white and ink.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1747C8",
          dark: "#0F3496",
          tint: "#EAF0FF",
          tint2: "#DCE6FF",
        },
        ink: {
          DEFAULT: "#0D1B3E",
          soft: "#33405F",
          muted: "#5A6787",
        },
        line: {
          DEFAULT: "#E3E8F2",
          strong: "#D6DDEB",
          soft: "#EEF1F7",
        },
        chalk: "#F5F7FB",
        pop: {
          DEFAULT: "#E0317A",
          dark: "#B0185A",
          tint: "#FDE7F0",
        },
        gain: {
          DEFAULT: "#0A9447",
          tint: "#E3F5EC",
        },
      },
      fontFamily: {
        sans: ["Readex Pro Variable", "Readex Pro", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.25rem",
      },
      boxShadow: {
        lift: "0 22px 40px -26px rgba(23, 71, 200, 0.55)",
        buy: "0 18px 40px -24px rgba(23, 71, 200, 0.35)",
        toast: "0 14px 34px rgba(13, 27, 62, 0.35)",
      },
      letterSpacing: {
        tightest: "-0.045em",
        display: "-0.065em",
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "toast-in": "toast-in .2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
