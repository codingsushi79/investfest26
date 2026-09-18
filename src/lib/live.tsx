"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Shared polling for anything that changes underneath the user: balances,
 * prices, offers, firm values. One timer per endpoint for the whole page, so
 * five components asking for the same data cost one request, and everything
 * refreshes without anyone hitting reload.
 */

const DEFAULT_INTERVAL_MS = Number(
  process.env.NEXT_PUBLIC_LIVE_REFRESH_MS || 8000
);

type Entry = {
  data: unknown;
  error: string | null;
  loading: boolean;
  subscribers: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
  inFlight: Promise<void> | null;
  lastFetched: number;
};

type LiveStore = {
  entries: Map<string, Entry>;
  intervalMs: number;
};

const LiveContext = createContext<LiveStore | null>(null);

export function LiveProvider({
  children,
  intervalMs = DEFAULT_INTERVAL_MS,
}: {
  children: React.ReactNode;
  intervalMs?: number;
}) {
  // Created once and kept for the life of the provider; reading it during
  // render is safe in a way a ref is not.
  const [store] = useState<LiveStore>(() => ({
    entries: new Map(),
    intervalMs,
  }));

  // Refresh as soon as the tab comes back, so a returning user never reads
  // numbers that went stale while they were away.
  useEffect(() => {

    function refreshAll() {
      if (document.visibilityState !== "visible") return;
      for (const url of store.entries.keys()) {
        void fetchInto(store, url);
      }
    }

    document.addEventListener("visibilitychange", refreshAll);
    window.addEventListener("focus", refreshAll);
    return () => {
      document.removeEventListener("visibilitychange", refreshAll);
      window.removeEventListener("focus", refreshAll);
    };
  }, [store]);

  return <LiveContext.Provider value={store}>{children}</LiveContext.Provider>;
}

function getEntry(store: LiveStore, url: string): Entry {
  let entry = store.entries.get(url);
  if (!entry) {
    entry = {
      data: undefined,
      error: null,
      loading: true,
      subscribers: new Set(),
      timer: null,
      inFlight: null,
      lastFetched: 0,
    };
    store.entries.set(url, entry);
  }
  return entry;
}

function notify(entry: Entry) {
  for (const callback of entry.subscribers) callback();
}

async function fetchInto(store: LiveStore, url: string) {
  const entry = getEntry(store, url);

  // Collapse concurrent requests for the same endpoint into one.
  if (entry.inFlight) return entry.inFlight;

  entry.inFlight = (async () => {
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        // A 401/404 is a real answer (signed out, feature off), not a crash.
        entry.error = `HTTP ${response.status}`;
        entry.data = undefined;
      } else {
        entry.data = await response.json();
        entry.error = null;
      }
    } catch {
      entry.error = "network";
    } finally {
      entry.loading = false;
      entry.lastFetched = Date.now();
      entry.inFlight = null;
      notify(entry);
    }
  })();

  return entry.inFlight;
}

export type LiveResult<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

/**
 * Subscribe to an endpoint. Returns its latest value and re-renders whenever
 * a poll brings something new. Pass `null` to opt out (e.g. feature disabled).
 */
export function useLive<T>(url: string | null): LiveResult<T> {
  const store = useContext(LiveContext);
  const [, forceRender] = useState(0);

  if (!store) {
    throw new Error("useLive must be used inside <LiveProvider>");
  }

  useEffect(() => {
    if (!url) return;

    const entry = getEntry(store, url);
    const callback = () => forceRender((n) => n + 1);
    entry.subscribers.add(callback);

    // First subscriber starts the polling; the rest ride along.
    if (!entry.timer) {
      entry.timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          void fetchInto(store, url);
        }
      }, store.intervalMs);
    }

    if (entry.data === undefined && !entry.inFlight) {
      void fetchInto(store, url);
    }

    return () => {
      entry.subscribers.delete(callback);
      // Last one out stops the timer so hidden pages cost nothing.
      if (entry.subscribers.size === 0 && entry.timer) {
        clearInterval(entry.timer);
        entry.timer = null;
      }
    };
  }, [store, url]);

  const refresh = useCallback(() => {
    if (url) void fetchInto(store, url);
  }, [store, url]);

  if (!url) {
    return { data: undefined, error: null, loading: false, refresh };
  }

  const entry = getEntry(store, url);
  return {
    data: entry.data as T | undefined,
    error: entry.error,
    loading: entry.loading,
    refresh,
  };
}

/**
 * Force an immediate re-poll of specific endpoints — call after a trade so the
 * new balance shows up at once instead of on the next tick.
 */
export function useLiveRefresh() {
  const store = useContext(LiveContext);
  return useCallback(
    (...urls: string[]) => {
      if (!store) return;
      const targets = urls.length > 0 ? urls : [...store.entries.keys()];
      for (const url of targets) {
        void fetchInto(store, url);
      }
    },
    [store]
  );
}
