/**
 * Plan/tier gating constants shared across the app. Single source of truth so
 * every screen that gates a feature by plan stays in sync — import from here
 * rather than redefining locally.
 */

/** Highest flashcard/lesson difficulty a free plan may use; 3+ is Pro-only. */
export const MAX_FREE_DIFFICULTY = 2;
