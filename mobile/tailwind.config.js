/** @type {import('tailwindcss').Config} */
const cssVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: cssVar("--primary"),
        "primary-foreground": cssVar("--primary-foreground"),
        background: cssVar("--background"),
        card: cssVar("--card"),
        secondary: cssVar("--secondary"),
        muted: cssVar("--muted"),
        accent: cssVar("--accent"),
        border: cssVar("--border"),
        foreground: cssVar("--foreground"),
      },
    },
  },
  plugins: [],
};
