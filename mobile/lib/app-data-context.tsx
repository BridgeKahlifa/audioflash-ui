import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import {
  fetchSRSQueue,
  fetchInProgressLesson,
  fetchCategories,
  fetchLanguages,
  fetchSessions,
  fetchSessionStats,
  fetchReviews,
  type ApiSRSQueue,
  type ApiLessonSession,
  type ApiCategory,
  type ApiLanguage,
  type ApiSession,
  type ApiSessionStats,
  type ApiReview,
} from "./api";

export type DataKey =
  | "srsQueue"
  | "inProgressLesson"
  | "categories"
  | "languages"
  | "sessions"
  | "sessionStats"
  | "savedReviews";

const STALE_MS: Record<DataKey, number> = {
  srsQueue:         60_000,
  inProgressLesson: 60_000,
  categories:       10 * 60_000,
  languages:        10 * 60_000,
  sessions:         60_000,
  sessionStats:     60_000,
  savedReviews:     60_000,
};

const ZERO_TIMESTAMPS: Record<DataKey, number> = {
  srsQueue: 0, inProgressLesson: 0, categories: 0,
  languages: 0, sessions: 0, sessionStats: 0, savedReviews: 0,
};

interface AppDataContextValue {
  ready: boolean;
  srsQueue: ApiSRSQueue | null;
  inProgressLesson: ApiLessonSession | null;
  inProgressLessonName: string | null;
  categories: ApiCategory[];
  languages: ApiLanguage[];
  sessions: ApiSession[];
  sessionStats: ApiSessionStats | null;
  savedReviews: ApiReview[];
  refresh: (key: DataKey) => Promise<void>;
  invalidate: (...keys: DataKey[]) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : null);

  const [ready, setReady] = useState(false);
  const [srsQueue, setSrsQueue] = useState<ApiSRSQueue | null>(null);
  const [inProgressLesson, setInProgressLesson] = useState<ApiLessonSession | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [sessionStats, setSessionStats] = useState<ApiSessionStats | null>(null);
  const [savedReviews, setSavedReviews] = useState<ApiReview[]>([]);

  const lastFetched = useRef<Record<DataKey, number>>({ ...ZERO_TIMESTAMPS });
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Derive lesson name from categories — no separate state needed
  const inProgressLessonName = useMemo(
    () => categories.find((c) => String(c.id) === String(inProgressLesson?.category_id))?.name ?? null,
    [inProgressLesson, categories],
  );

  const fetchKey = useCallback(async (key: DataKey) => {
    const t = tokenRef.current;
    try {
      switch (key) {
        case "srsQueue": {
          const data = await fetchSRSQueue(t);
          setSrsQueue(data);
          break;
        }
        case "inProgressLesson": {
          const data = await fetchInProgressLesson(t);
          setInProgressLesson(data);
          break;
        }
        case "categories": {
          const data = await fetchCategories();
          setCategories(data);
          break;
        }
        case "languages": {
          const data = await fetchLanguages();
          setLanguages(data);
          break;
        }
        case "sessions": {
          const data = await fetchSessions(t);
          setSessions(data);
          break;
        }
        case "sessionStats": {
          const data = await fetchSessionStats(t);
          setSessionStats(data);
          break;
        }
        case "savedReviews": {
          const data = await fetchReviews(t);
          setSavedReviews(data.filter((r) => !r.ended_at));
          break;
        }
      }
      lastFetched.current[key] = Date.now();
    } catch {
      // Non-critical — keep stale data visible
    }
  }, []);

  const refresh = useCallback(async (key: DataKey) => {
    if (Date.now() - lastFetched.current[key] < STALE_MS[key]) return;
    await fetchKey(key);
  }, [fetchKey]);

  const invalidate = useCallback((...keys: DataKey[]) => {
    keys.forEach((k) => { lastFetched.current[k] = 0; });
    keys.forEach((k) => { fetchKey(k); });
  }, [fetchKey]);

  // Clear all data on sign-out
  useEffect(() => {
    if (userId) return;
    setSrsQueue(null);
    setInProgressLesson(null);
    setCategories([]);
    setLanguages([]);
    setSessions([]);
    setSessionStats(null);
    setSavedReviews([]);
    setReady(false);
    lastFetched.current = { ...ZERO_TIMESTAMPS };
  }, [userId]);

  // Re-mount splash if a new user signs in
  // Preload everything once userId is established
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function preload() {
      await Promise.allSettled([
        sleep(1500),
        fetchKey("srsQueue"),
        fetchKey("inProgressLesson"),
        fetchKey("categories"),
        fetchKey("languages"),
        fetchKey("sessions"),
        fetchKey("sessionStats"),
        fetchKey("savedReviews"),
      ]);
      if (!cancelled) setReady(true);
    }

    preload();
    return () => { cancelled = true; };
  }, [userId, fetchKey]);

  return (
    <AppDataContext.Provider value={{
      ready,
      srsQueue,
      inProgressLesson,
      inProgressLessonName,
      categories,
      languages,
      sessions,
      sessionStats,
      savedReviews,
      refresh,
      invalidate,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
