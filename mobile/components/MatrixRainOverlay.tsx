import { useEffect, useRef } from "react";
import { Platform } from "react-native";

export function MatrixRainOverlay({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== "web") {
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    canvasRef.current = canvas;
    canvas.className = "matrix-rain-overlay";
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    canvas.style.opacity = "0.2";
    canvas.style.mixBlendMode = "screen";
    document.body.appendChild(canvas);

    const chars = "01";
    let animationFrame = 0;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const columns = Math.floor(canvas.width / 20);
      drops = Array(columns).fill(1);
    };

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = "15px monospace";

      for (let index = 0; index < drops.length; index += 1) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = index * 20;
        const y = drops[index] * 20;

        ctx.fillStyle = `rgba(255, 107, 74, ${Math.random() * 0.5 + 0.5})`;
        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[index] = 0;
        }

        drops[index] += 1;
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      canvas.remove();
      canvasRef.current = null;
    };
  }, [enabled]);

  return null;
}
