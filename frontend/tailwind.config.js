/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens — actual values live as CSS variables in
        // globals.css (:root for dark, [data-theme="light"] for light).
        // The rgb(var(...) / <alpha-value>) form keeps Tailwind's opacity
        // modifiers (e.g. bg-surface/90) working in both themes.
        navy:    "rgb(var(--color-navy) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          2: "rgb(var(--color-surface-2) / <alpha-value>)",
          3: "rgb(var(--color-surface-3) / <alpha-value>)",
          4: "rgb(var(--color-surface-4) / <alpha-value>)",
        },
        text: {
          DEFAULT: "rgb(var(--color-text) / <alpha-value>)",
          2: "rgb(var(--color-text-2) / <alpha-value>)",
          3: "rgb(var(--color-text-3) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          2: "rgb(var(--color-border-2) / <alpha-value>)",
          3: "rgb(var(--color-border-3) / <alpha-value>)",
        },
        // Accent colors stay constant across themes. Deliberately using the
        // -600 shade (not the more vibrant -500) as DEFAULT — it's the
        // darkest point that still reads as "teal"/"cyan" while clearing
        // ~3.7:1 contrast as text/borders on a white light-mode surface;
        // the -500 shade only hit 2.4:1 there.
        teal:  { DEFAULT: "#0D9488", dark: "#0F766E", dim: "rgba(13,148,136,0.15)", glow: "rgba(13,148,136,0.25)" },
        cyan:  "#0891B2",
        emerald: "#10B981",
        amber:   "#F59E0B",
        rose:    "#F43F5E",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "14px",
        lg: "20px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(13,148,136,0.25)",
        lg: "0 24px 80px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
