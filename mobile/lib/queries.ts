import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "./auth-context";
import {
  fetchSRSQueue,
  fetchInProgressLesson,
  fetchCategories,
  fetchLanguages,
  fetchSessions,
  fetchSessionStats,
  fetchReviews,
  fetchDecks,
  fetchDeck,
  fetchDeckCards,
} from "./api";
import { queryKeys } from "./query-keys";

export { queryKeys } from "./query-keys";

// ── Shared filter ──────────────────────────────────────────────────────────────

export function filterActiveReviews<T extends { ended_at: string | null }>(reviews: T[]): T[] {
  return reviews.filter((r) => !r.ended_at);
}

// ── Stale times ────────────────────────────────────────────────────────────────

const STALE = {
  user:   60_000,
  stable: 10 * 60_000,
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useSRSQueue() {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  return useQuery({
    queryKey: queryKeys.srsQueue(userId),
    queryFn:  () => fetchSRSQueue(token ?? null),
    enabled:  !!(token || isDevAuth),
    staleTime: STALE.user,
  });
}

export function useInProgressLesson() {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  return useQuery({
    queryKey: queryKeys.inProgressLesson(userId),
    queryFn:  () => fetchInProgressLesson(token ?? null),
    enabled:  !!(token || isDevAuth),
    staleTime: STALE.user,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn:  fetchCategories,
    staleTime: STALE.stable,
  });
}

export function useLanguages() {
  return useQuery({
    queryKey: queryKeys.languages(),
    queryFn:  fetchLanguages,
    staleTime: STALE.stable,
  });
}

export function useSessions() {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  return useQuery({
    queryKey: queryKeys.sessions(userId),
    queryFn:  () => fetchSessions(token ?? null),
    enabled:  !!(token || isDevAuth),
    staleTime: STALE.user,
  });
}

export function useSessionStats() {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  return useQuery({
    queryKey: queryKeys.sessionStats(userId),
    queryFn:  () => fetchSessionStats(token ?? null),
    enabled:  !!(token || isDevAuth),
    staleTime: STALE.user,
  });
}

export function useSavedReviews() {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  return useQuery({
    queryKey: queryKeys.savedReviews(userId),
    queryFn:  async () => filterActiveReviews(await fetchReviews(token ?? null)),
    enabled:  !!(token || isDevAuth),
    staleTime: STALE.user,
  });
}

// ── Derived hook ───────────────────────────────────────────────────────────────

export function useInProgressLessonName(): string | null {
  const { data: lesson }     = useInProgressLesson();
  const { data: categories } = useCategories();
  return useMemo(
    () => categories?.find((c) => String(c.id) === String(lesson?.category_id))?.name ?? null,
    [lesson, categories],
  );
}

// ── Deck hooks ─────────────────────────────────────────────────────────────────

export function useDecks() {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  return useQuery({
    queryKey: queryKeys.decks(userId),
    queryFn:  () => fetchDecks(token ?? null),
    enabled:  !!(token || isDevAuth),
    staleTime: STALE.user,
  });
}

export function useDeck(deckId: string) {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  return useQuery({
    queryKey: queryKeys.deck(userId, deckId),
    queryFn:  () => fetchDeck(token ?? null, deckId),
    enabled:  !!(token || isDevAuth) && !!deckId,
    staleTime: STALE.user,
  });
}

export function useDeckCards(deckId: string) {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  return useQuery({
    queryKey: queryKeys.deckCards(userId, deckId),
    queryFn:  () => fetchDeckCards(token ?? null, deckId),
    enabled:  !!(token || isDevAuth) && !!deckId,
    staleTime: STALE.user,
  });
}

// ── Invalidation helper ────────────────────────────────────────────────────────

export function useInvalidateAppData() {
  const qc = useQueryClient();
  const { session, isDevAuth } = useAuth();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");

  return useCallback((...keys: (keyof typeof queryKeys)[]) => {
    for (const key of keys) {
      const qKey =
        key === "categories" || key === "languages"
          ? (queryKeys[key] as () => readonly string[])()
          : (queryKeys[key] as (id: string) => readonly string[])(userId);
      // Remove from persisted cache so a crash before re-fetch completes
      // doesn't restore stale data on next launch.
      qc.removeQueries({ queryKey: qKey });
      qc.invalidateQueries({ queryKey: qKey });
    }
  }, [qc, userId]);
}
