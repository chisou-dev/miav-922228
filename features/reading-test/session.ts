"use client";

import { useSyncExternalStore } from "react";

const PREFIX = "reading-test:";
const startedAtCache = new Map<string, number>();

export function readingStartedAtKey(slug: string) {
  return `${PREFIX}${slug}:startedAt`;
}

/** Clears a previous attempt so Start Reading begins a new clock. */
export function clearReadingAttempt(slug: string) {
  startedAtCache.delete(slug);
  try {
    sessionStorage.removeItem(readingStartedAtKey(slug));
  } catch {
    // Private mode or blocked storage: the page clock still starts in memory.
  }
}

function readStartedAt(slug: string): number {
  const cached = startedAtCache.get(slug);
  if (cached != null) return cached;

  const now = Date.now();
  let freshStart = false;
  try {
    freshStart = new URLSearchParams(window.location.search).get("start") === "1";
  } catch {
    freshStart = false;
  }

  let started = now;
  try {
    const existing = Number(sessionStorage.getItem(readingStartedAtKey(slug)));
    if (
      !freshStart &&
      Number.isFinite(existing) &&
      existing > 0 &&
      existing <= now
    ) {
      started = existing;
    } else {
      sessionStorage.setItem(readingStartedAtKey(slug), String(now));
    }
  } catch {
    // Clock still runs in memory when storage is unavailable.
  }

  if (freshStart) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("start");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Keeping the query only means a refresh starts the clock again.
    }
  }

  startedAtCache.set(slug, started);
  return started;
}

function subscribeToReadingClock() {
  return () => {};
}

/** Null during server render. On the client, the moment the passage is shown. */
export function useReadingStartedAt(slug: string): number | null {
  return useSyncExternalStore(
    subscribeToReadingClock,
    () => readStartedAt(slug),
    () => null,
  );
}
