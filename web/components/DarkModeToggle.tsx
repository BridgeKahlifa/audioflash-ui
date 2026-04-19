"use client";

import { useTheme } from "./ThemeProvider";

type DarkModeToggleProps = {
  className?: string;
};

export function DarkModeToggle({ className }: DarkModeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const currentLabel = isDark ? "Dark Mode" : "Light";
  const buttonClassName = [
    "matrix-panel inline-flex items-center gap-4 rounded-full border border-border bg-card/90 pl-5 pr-3 py-2 text-xs uppercase tracking-[0.28em] text-foreground backdrop-blur",
    isDark ? "font-mono" : "font-sans",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={buttonClassName}
    >
      <span className="matrix-text-glow min-w-[10ch] text-left">{currentLabel}</span>
      <span className="relative h-7 w-14 rounded-full border border-border/80 bg-secondary/90">
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-primary transition-[left] duration-200 ${
            isDark ? "left-8" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
