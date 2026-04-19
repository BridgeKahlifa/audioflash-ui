import type { Config } from "tailwindcss";

const cssVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: cssVar("--primary-rgb"),
        "primary-foreground": cssVar("--primary-foreground-rgb"),
        background: cssVar("--background-rgb"),
        foreground: cssVar("--foreground-rgb"),
        card: cssVar("--card-rgb"),
        "card-foreground": cssVar("--card-foreground-rgb"),
        popover: cssVar("--popover-rgb"),
        "popover-foreground": cssVar("--popover-foreground-rgb"),
        secondary: cssVar("--secondary-rgb"),
        "secondary-foreground": cssVar("--secondary-foreground-rgb"),
        muted: cssVar("--muted-foreground-rgb"),
        "muted-surface": cssVar("--muted-rgb"),
        accent: cssVar("--accent-rgb"),
        "accent-foreground": cssVar("--accent-foreground-rgb"),
        border: cssVar("--border-rgb"),
        destructive: cssVar("--destructive-rgb"),
        input: cssVar("--input-rgb"),
        ring: cssVar("--ring-rgb"),
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Share Tech Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
