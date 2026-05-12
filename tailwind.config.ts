import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:  "#F07000",
          orange2: "#F4A261",
          navy:    "#0B0D14",
          dark:    "#0A0A0F",
          surface: "#0D1020",
          card:    "#0F1120",
          border:  "#1A1D28",
          text:    "#E2E8F0",
          muted:   "#556080",
          discord: "#5865F2",
        },
      },
      fontFamily: {
        heading: ["var(--font-rajdhani)", "sans-serif"],
        body:    ["var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "racing-grid":
          "linear-gradient(rgba(240,112,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(240,112,0,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        "orange-glow":    "0 0 20px rgba(240,112,0,0.20)",
        "orange-glow-lg": "0 0 40px rgba(240,112,0,0.28)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "ticker":  "ticker 25s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
