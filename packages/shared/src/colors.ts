export const colors = {
  primary: "#E86A4A",
  primaryForeground: "#FFFFFF",
  background: "#FFF7F2",
  card: "#FFFDFC",
  secondary: "#FBE7DE",
  muted: "#8B6E66",
  accent: "#FFD9CA",
  border: "#F2CBBE",
  foreground: "#2F1E19",
} as const;

export type ColorToken = keyof typeof colors;
