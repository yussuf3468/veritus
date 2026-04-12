import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#08080f",
          secondary: "#0c0c18",
          panel: "#11111f",
          elevated: "#16162a",
        },
        brand: {
          cyan: "#00d4ff",
          purple: "#7c3aed",
          green: "#00ff88",
          pink: "#f472b6",
          orange: "#fb923c",
        },
        surface: {
          DEFAULT: "rgba(255,255,255,0.04)",
          hover: "rgba(255,255,255,0.07)",
          active: "rgba(0,212,255,0.08)",
          border: "rgba(255,255,255,0.07)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite alternate",
        float: "float 3s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%": { boxShadow: "0 0 5px rgba(0,212,255,0.3)" },
          "100%": {
            boxShadow:
              "0 0 20px rgba(0,212,255,0.7), 0 0 40px rgba(0,212,255,0.2)",
          },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      backdropBlur: { xs: "2px" },
      boxShadow: {
        glow: "0 0 20px rgba(0,212,255,0.25)",
        "glow-lg": "0 0 40px rgba(0,212,255,0.4)",
        panel:
          "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
