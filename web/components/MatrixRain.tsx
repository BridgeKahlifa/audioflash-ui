"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

const glyphs = "01";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (theme !== "dark") {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!canvas || !context || reducedMotion.matches) {
      return;
    }

    let animationFrame = 0;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const columnCount = Math.max(1, Math.floor(canvas.width / 18));
      drops = Array.from({ length: columnCount }, () =>
        Math.floor(Math.random() * canvas.height * -0.08),
      );
    };

    const draw = () => {
      context.fillStyle = "rgba(0, 0, 0, 0.08)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = "16px 'Share Tech Mono', monospace";

      for (let index = 0; index < drops.length; index += 1) {
        const text = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = index * 18;
        const y = drops[index] * 18;

        context.fillStyle = "rgba(255, 140, 66, 0.9)";
        context.shadowColor = "rgba(255, 107, 74, 0.45)";
        context.shadowBlur = 12;
        context.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[index] = Math.floor(Math.random() * -20);
        }

        drops[index] += 1;
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 ${
        theme === "dark" ? "opacity-50" : "opacity-0"
      }`}
    />
  );
}
