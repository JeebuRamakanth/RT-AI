/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
        },
        signal: {
          DEFAULT: "rgb(var(--signal) / <alpha-value>)",
          soft: "rgb(var(--signal-soft) / <alpha-value>)",
          glow: "rgb(var(--signal-glow) / <alpha-value>)",
        },
        pearl: {
          DEFAULT: "rgb(var(--pearl) / <alpha-value>)",
          muted: "rgb(var(--pearl-muted) / <alpha-value>)",
          faint: "rgb(var(--pearl-faint) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
      },
      boxShadow: {
        surface: "var(--shadow-surface)",
        elevated: "var(--shadow-elevated)",
        glow: "var(--shadow-glow)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "breathe": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.9" },
        },
        "aurora-pan": {
          "0%": { transform: "translate3d(-10%, -8%, 0) scale(1)" },
          "100%": { transform: "translate3d(10%, 8%, 0) scale(1.15)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.8s ease-out both",
        "breathe": "breathe 6s ease-in-out infinite",
        "aurora-pan": "aurora-pan 24s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
