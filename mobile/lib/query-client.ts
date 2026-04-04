import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";

// Wire up AppState so TanStack Query knows when the app foregrounds.
// Called once at startup — subscription.remove() is available if cleanup is ever needed.
AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active");
});

// Pause queries while offline, retry automatically when reconnected.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected ?? true);
  });
});

const DAY_MS = 24 * 60 * 60 * 1000;
export const QUERY_CACHE_PERSIST_KEY = "audioflash-query-cache";
type CacheResetSnapshot = { inProgress: boolean; version: number };

let cacheResetSnapshot: CacheResetSnapshot = { inProgress: false, version: 0 };
const cacheResetListeners = new Set<() => void>();

function emitCacheResetSnapshot() {
  for (const listener of cacheResetListeners) listener();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Keep data in memory (and persisted) for 24h to match the persister maxAge.
      // Default 5min gcTime would evict data before the 24h window expires.
      gcTime: DAY_MS,
      retry: 1,
      refetchOnMount: true,
      refetchOnWindowFocus: true, // works via AppState wiring above
    },
  },
});

export function subscribeToCacheReset(listener: () => void) {
  cacheResetListeners.add(listener);
  return () => cacheResetListeners.delete(listener);
}

export function getCacheResetSnapshot() {
  return cacheResetSnapshot;
}

export function finishQueryCacheReset() {
  if (!cacheResetSnapshot.inProgress) return;
  cacheResetSnapshot = { ...cacheResetSnapshot, inProgress: false };
  emitCacheResetSnapshot();
}

export async function clearQueryCache(options?: { coldStart?: boolean }) {
  const coldStart = options?.coldStart ?? false;

  if (coldStart) {
    cacheResetSnapshot = {
      inProgress: true,
      version: cacheResetSnapshot.version + 1,
    };
    emitCacheResetSnapshot();
  }

  await queryClient.cancelQueries();

  if (coldStart) {
    await queryClient.resetQueries();
    queryClient.removeQueries({ type: "inactive" });
  } else {
    queryClient.clear();
  }

  await AsyncStorage.removeItem(QUERY_CACHE_PERSIST_KEY);
}
