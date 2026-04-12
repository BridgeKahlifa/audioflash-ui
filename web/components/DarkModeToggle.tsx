"use client";

import { useTheme } from "./ThemeProvider";

export function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className="matrix-panel fixed right-4 top-4 z-[70] inline-flex items-center gap-3 rounded-full border border-border bg-card/90 px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-foreground backdrop-blur md:right-6 md:top-6"
    >
      <span className="matrix-text-glow">{isDark ? "Matrix" : "Light"}</span>
      <span className="relative h-6 w-12 rounded-full bg-secondary">
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-primary transition-transform ${
            isDark ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
