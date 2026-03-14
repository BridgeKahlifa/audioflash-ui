export const colors = {
  primary: "#FF6B4A",
  primaryForeground: "#FFFFFF",
  background: "#FAFAFA",
  card: "#FFFFFF",
  secondary: "#F5F5F5",
  muted: "#737373",
  accent: "#FFF0ED",
  border: "#E5E5E5",
  foreground: "#1A1A1A",
} as const;

export type ColorToken = keyof typeof colors;
