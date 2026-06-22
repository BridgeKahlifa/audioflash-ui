import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueries, useIsRestoring } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import { captureHandledException, useAnalytics } from "./analytics";
import { filterActiveReviews } from "./queries";
import { useAuth } from "./auth-context";
import {
  finishQueryCacheReset,
  getCacheResetSnapshot,
  subscribeToCacheReset,
} from "./query-client";
import {
  fetchSRSQueue,
  fetchInProgressLesson,
  fetchCategories,
  fetchLanguages,
  fetchSessions,
  fetchSessionStats,
  fetchReviews,
} from "./api";

interface AppDataContextValue {
  ready: boolean;
}

const AppDataContext = createContext<AppDataContextValue>({ ready: false });

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { session, isDevAuth } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  const enabled = !!(token || isDevAuth);
  const posthog = useAnalytics();

  const isRestoring = useIsRestoring();
  const cacheReset = useSyncExternalStore(subscribeToCacheReset, getCacheResetSnapshot);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [minTimeCycle, setMinTimeCycle] = useState(0);
  useEffect(() => {
    if (isRestoring || minTimeCycle === 0) return;
    setMinTimeElapsed(false);
    const t = setTimeout(() => setMinTimeElapsed(true), 1500);
    return () => clearTimeout(t);
  }, [isRestoring, minTimeCycle]);

  const appQueries = useMemo(
    () => [
      {
        queryName: "srs_queue",
        queryKey: queryKeys.srsQueue(userId),
        queryFn: () => fetchSRSQueue(token),
        enabled,
        staleTime: 60_000,
      },
      {
        queryName: "in_progress_lesson",
        queryKey: queryKeys.inProgressLesson(userId),
        queryFn: () => fetchInProgressLesson(token),
        enabled,
        staleTime: 60_000,
      },
      {
        queryName: "categories",
        queryKey: queryKeys.categories(),
        queryFn: () => fetchCategories(token),
        enabled,
        staleTime: 10 * 60_000,
      },
      {
        queryName: "languages",
        queryKey: queryKeys.languages(),
        queryFn: fetchLanguages,
        staleTime: 10 * 60_000,
      },
      {
        queryName: "sessions",
        queryKey: queryKeys.sessions(userId),
        queryFn: () => fetchSessions(token),
        enabled,
        staleTime: 60_000,
      },
      {
        queryName: "session_stats",
        queryKey: queryKeys.sessionStats(userId),
        queryFn: () => fetchSessionStats(token),
        enabled,
        staleTime: 60_000,
      },
      {
        queryName: "saved_reviews",
        queryKey: queryKeys.savedReviews(userId),
        queryFn: async () => filterActiveReviews(await fetchReviews(token)),
        enabled,
        staleTime: 60_000,
      },
    ],
    [enabled, token, userId],
  );

  const results = useQueries({
    queries: appQueries,
  });
  const reportedQueryErrorsRef = useRef<Record<string, string>>({});

  const queriesSettled = !enabled || results.every((r) => r.isFetched);
  const hasCachedData = results.some((r) => r.data !== undefined);
  const needsMinTime = !hasCachedData;
  const ready =
    !isRestoring &&
    !cacheReset.inProgress &&
    queriesSettled &&
    (!needsMinTime || minTimeElapsed);

  // Start the 1.5s gate the first time we have no cached data after restore,
  // and whenever a previously warm cache is explicitly cleared.
  const prevHasCachedDataRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (isRestoring || cacheReset.inProgress) return;

    const hadCachedData = prevHasCachedDataRef.current;
    const enteringColdStart =
      (!hasCachedData && hadCachedData === null) ||
      (!hasCachedData && hadCachedData === true);

    if (enteringColdStart) {
      setMinTimeCycle((cycle) => cycle + 1);
    }

    prevHasCachedDataRef.current = hasCachedData;
  }, [cacheReset.inProgress, hasCachedData, isRestoring]);

  useEffect(() => {
    if (cacheReset.version === 0) return;
    setMinTimeCycle((cycle) => cycle + 1);
  }, [cacheReset.version]);

  useEffect(() => {
    if (!cacheReset.inProgress || isRestoring) return;
    if (!queriesSettled || !minTimeElapsed) return;
    finishQueryCacheReset();
  }, [cacheReset.inProgress, isRestoring, queriesSettled, minTimeElapsed]);

  useEffect(() => {
    appQueries.forEach((query, index) => {
      const result = results[index];
      if (!result?.error) return;

      const errorMessage =
        typeof (result.error as any)?.message === "string"
          ? (result.error as any).message
          : String(result.error);
      const queryKey = JSON.stringify(query.queryKey);
      const fingerprint = `${queryKey}:${errorMessage}`;

      if (reportedQueryErrorsRef.current[query.queryName] === fingerprint) return;
      reportedQueryErrorsRef.current[query.queryName] = fingerprint;

      captureHandledException(posthog, result.error, {
        error_context: "app_data_query",
        query_name: query.queryName,
        query_key: queryKey,
        is_dev_auth: isDevAuth,
      });
    });
  }, [appQueries, isDevAuth, posthog, results]);

  return (
    <AppDataContext.Provider value={{ ready }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext);
}
