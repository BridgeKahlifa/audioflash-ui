/** @type {import('tailwindcss').Config} */
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
    },
  },
  plugins: [],
};
