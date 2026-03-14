import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FF6B4A",
        "primary-foreground": "#FFFFFF",
        background: "#FAFAFA",
        card: "#FFFFFF",
        secondary: "#F5F5F5",
        muted: "#737373",
        accent: "#FFF0ED",
        border: "#E5E5E5",
        foreground: "#1A1A1A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
