export function playAudioFile(src: string, speed: number, onEnd?: () => void) {
  if (typeof window === "undefined") return;
  const audio = new Audio(src);
  audio.playbackRate = speed;
  audio.onended = () => onEnd?.();
  audio.onerror = () => onEnd?.();
  audio.play().catch(() => onEnd?.());
}
