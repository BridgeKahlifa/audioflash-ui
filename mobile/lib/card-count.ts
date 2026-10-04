// Shared card-count rules for the lesson and deck practice setup screens.
// Both screens let you pick any amount up to the number of cards that actually
// exist, so the only floor is a single card.
export const MIN_CARD_COUNT = 1;

// Used when a screen cannot tell how many cards exist yet. The slider still
// needs an upper bound to draw against, and the request is clamped to the real
// availability before it goes out.
export const FALLBACK_MAX_CARD_COUNT = 50;

export function resolveCardCountBounds(availableCardCount: number | null) {
  const max =
    availableCardCount === null
      ? FALLBACK_MAX_CARD_COUNT
      : Math.max(0, Math.floor(availableCardCount));
  return { min: MIN_CARD_COUNT, max };
}

export function clampCardCount(value: number, availableCardCount: number | null) {
  const { min, max } = resolveCardCountBounds(availableCardCount);
  if (max <= 0) return 0;
  if (!Number.isFinite(value)) return Math.min(min, max);
  return Math.min(max, Math.max(min, Math.round(value)));
}
