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
        primary: "#E86A4A",
        "primary-foreground": "#FFFFFF",
        background: "#FFF7F2",
        card: "#FFFDFC",
        secondary: "#FBE7DE",
        muted: "#8B6E66",
        accent: "#FFD9CA",
        border: "#F2CBBE",
        foreground: "#2F1E19",
      },
    },
  },
  plugins: [],
};
