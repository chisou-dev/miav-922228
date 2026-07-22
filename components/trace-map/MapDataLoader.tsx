"use client";

import { useCallback, useState } from "react";
import type { User } from "firebase/auth";
import { getIdTokenOrNull } from "@/lib/trace/auth";
import {
  TRACE_PAGE_SIZE,
  type MemoryStar,
  type PlaceScope,
  type TracePin,
  type TraceStats,
} from "@/lib/trace/types";
import {
  getOrCreateVisitorId,
  readVisitorId,
} from "@/lib/trace/visitorId";

function emptyStats(): TraceStats {
  return {
    placeCount: 0,
    memoryCount: 0,
    guestCount: 0,
    googleCount: 0,
    latest: null,
  };
}

export function useMapDataLoader() {
  const [stars, setStars] = useState<MemoryStar[]>([]);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  const [posted, setPosted] = useState(false);
  const [mine, setMine] = useState<TracePin | null>(null);

  const [placeScope, setPlaceScope] = useState<PlaceScope | null>(null);
  const [traces, setTraces] = useState<TracePin[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [tracesLoadingMore, setTracesLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadMap = useCallback(async () => {
    setMapLoading(true);
    try {
      const response = await fetch("/api/trace?view=map");
      const data = (await response.json().catch(() => null)) as {
        stars?: MemoryStar[];
        stats?: TraceStats;
      } | null;
      if (!response.ok) {
        setStars([]);
        setStats(emptyStats());
        return;
      }
      setStars(data?.stars || []);
      setStats(data?.stats || emptyStats());
    } finally {
      setMapLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async (user: User | null) => {
    const visitorId = readVisitorId() || getOrCreateVisitorId();
    const token = await getIdTokenOrNull(user);
    const params = new URLSearchParams({ view: "status", visitorId });
    const response = await fetch(`/api/trace?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = (await response.json().catch(() => null)) as {
      posted?: boolean;
      mine?: TracePin | null;
    } | null;
    if (!response.ok) return;
    setPosted(Boolean(data?.posted));
    setMine(data?.mine || null);
  }, []);

  const loadMemories = useCallback(async (scope: PlaceScope) => {
    setPlaceScope(scope);
    setTracesLoading(true);
    setTraces([]);
    setNextCursor(null);
    setHasMore(false);
    try {
      const params = new URLSearchParams({
        view: "memories",
        locationId: scope.locationId,
        limit: String(TRACE_PAGE_SIZE),
      });
      const response = await fetch(`/api/trace?${params.toString()}`);
      const data = (await response.json().catch(() => null)) as {
        traces?: TracePin[];
        nextCursor?: string | null;
        hasMore?: boolean;
      } | null;
      if (!response.ok) {
        setTraces([]);
        return;
      }
      setTraces(data?.traces || []);
      setNextCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } finally {
      setTracesLoading(false);
    }
  }, []);

  const loadMoreMemories = useCallback(async () => {
    if (!placeScope || !hasMore || !nextCursor || tracesLoadingMore) return;
    setTracesLoadingMore(true);
    try {
      const params = new URLSearchParams({
        view: "memories",
        locationId: placeScope.locationId,
        limit: String(TRACE_PAGE_SIZE),
        cursor: nextCursor,
      });
      const response = await fetch(`/api/trace?${params.toString()}`);
      const data = (await response.json().catch(() => null)) as {
        traces?: TracePin[];
        nextCursor?: string | null;
        hasMore?: boolean;
      } | null;
      if (!response.ok) return;
      setTraces((current) => [...current, ...(data?.traces || [])]);
      setNextCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } finally {
      setTracesLoadingMore(false);
    }
  }, [placeScope, hasMore, nextCursor, tracesLoadingMore]);

  const closeViewer = useCallback(() => {
    setPlaceScope(null);
    setTraces([]);
    setNextCursor(null);
    setHasMore(false);
  }, []);

  return {
    stars,
    stats,
    mapLoading,
    loadMap,
    posted,
    mine,
    setMine,
    setPosted,
    loadStatus,
    placeScope,
    traces,
    tracesLoading,
    tracesLoadingMore,
    hasMore,
    loadMemories,
    loadMoreMemories,
    closeViewer,
  };
}

export type MapDataLoaderApi = ReturnType<typeof useMapDataLoader>;
