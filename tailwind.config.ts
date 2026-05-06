import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#E63946",
          orange: "#F4A261",
          dark: "#0A0A0F",
          surface: "#111118",
          card: "#16161F",
          border: "#1E1E2E",
          text: "#E2E8F0",
          muted: "#64748B",
          discord: "#5865F2",
        },
      },
      fontFamily: {
        heading: ["var(--font-rajdhani)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "racing-grid":
          "linear-gradient(rgba(244,162,97,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(244,162,97,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        "orange-glow": "0 0 20px rgba(244, 162, 97, 0.15)",
        "orange-glow-lg": "0 0 40px rgba(244, 162, 97, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
