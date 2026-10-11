import type { Config } from "tailwindcss";

// Bonétat design tokens. The palette itself lives in globals.css (:root, CSS variables as "R G B"),
// so a whole theme (burgundy, orange, violet…) is swapped in one place. Roles, not hues:
// brand = actions and prices, offer = "compare offers", gain = money saved, pop = attention.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Main color: actions, links, selection, prices
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          dark: "rgb(var(--brand-dark) / <alpha-value>)",
          tint: "rgb(var(--brand-tint) / <alpha-value>)",
          tint2: "rgb(var(--brand-tint2) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          strong: "rgb(var(--line-strong) / <alpha-value>)",
          soft: "rgb(var(--line-soft) / <alpha-value>)",
        },
        chalk: "rgb(var(--chalk) / <alpha-value>)",
        silver: {
          DEFAULT: "rgb(var(--silver) / <alpha-value>)",
          deep: "rgb(var(--silver-deep) / <alpha-value>)",
        },
        pop: {
          DEFAULT: "#E0317A",
          dark: "#B0185A",
          tint: "#FDE7F0",
        },
        gain: {
          DEFAULT: "#0A9447",
          tint: "#E3F5EC",
        },
        // "Compare offers": only for "several shops sell this", never decoration (globals.css --offer*)
        offer: {
          DEFAULT: "rgb(var(--offer) / <alpha-value>)",
          dark: "rgb(var(--offer-dark) / <alpha-value>)",
          tint: "rgb(var(--offer-tint) / <alpha-value>)",
          line: "rgb(var(--offer-line) / <alpha-value>)",
        },
        // Dark panels (trust block, dark tiles): white text on it
        trust: "rgb(var(--trust) / <alpha-value>)",
        // Prices on light grounds: the main color, so a price never reads like a title (titles are ink)
        price: "rgb(var(--brand) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Readex Pro Variable", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        brand: ["Readex Pro Variable", "Readex Pro", "system-ui", "sans-serif"],
      },
      // Every corner of the app reads three variables (globals.css :root): tune or revert the
      // whole look in one place. rounded-full (pills, avatars) is untouched.
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius-sm)",
        lg: "var(--radius-control)",
        xl: "var(--radius-control)",
        "2xl": "var(--radius-panel)",
        "3xl": "var(--radius-panel)",
        "4xl": "var(--radius-panel)",
        "5xl": "var(--radius-panel)",
        control: "var(--radius-control)",
        panel: "var(--radius-panel)",
      },
      boxShadow: {
        lift: "0 22px 40px -26px rgb(var(--brand) / 0.5)",
        buy: "0 18px 40px -24px rgb(var(--brand) / 0.3)",
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
