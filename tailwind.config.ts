import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1F2937",
        panel: "#FFFFFF",
        quest: "#EAF3FF",
        neon: "#1677FF",
        goose: "#22C55E",
        gold: "#F59E0B",
        pigeon: "#EF4444",
        tencent: "#1677FF"
      },
      boxShadow: {
        glow: "0 8px 24px rgba(31,41,55,.08)",
        danger: "0 8px 24px rgba(239,68,68,.10)"
      },
      fontFamily: {
        display: ["ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
