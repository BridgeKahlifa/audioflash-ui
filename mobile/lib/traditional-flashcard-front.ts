export type TraditionalFlashcardFront = "native" | "target";

export const DEFAULT_TRADITIONAL_FLASHCARD_FRONT: TraditionalFlashcardFront = "native";

export function normalizeTraditionalFlashcardFront(
  value?: TraditionalFlashcardFront | string | null,
): TraditionalFlashcardFront {
  return value === "target" ? "target" : DEFAULT_TRADITIONAL_FLASHCARD_FRONT;
}
