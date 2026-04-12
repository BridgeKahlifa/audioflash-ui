import type { FlashcardDisplayMode } from "./types";

export const DEFAULT_FLASHCARD_DISPLAY_MODE: FlashcardDisplayMode = "audio-first";

export function normalizeFlashcardDisplayMode(
  value?: FlashcardDisplayMode | string | null,
): FlashcardDisplayMode {
  return value === "traditional" ? "traditional" : DEFAULT_FLASHCARD_DISPLAY_MODE;
}
