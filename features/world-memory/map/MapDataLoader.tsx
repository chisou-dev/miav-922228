"use client";

import { useCallback, useState } from "react";
import type { User } from "firebase/auth";
import { getIdTokenOrNull } from "@/features/world-memory/trace/auth";
import {
  TRACE_PAGE_SIZE,
  type MemoryStar,
  type PlaceScope,
  type TracePin,
  type TraceStats,
} from "@/features/world-memory/trace/types";
import type { GeographyAggregate } from "@/features/world-memory/trace/aggregate";
import type { TraceCategory } from "@/features/world-memory/trace/works";
import { TRACE_CATEGORIES } from "@/features/world-memory/trace/works";

function emptyStats(): TraceStats {
  return {
    placeCount: 0,
    memoryCount: 0,
    guestCount: 0,
    googleCount: 0,
    latest: null,
  };
}

export type GeoScope =
  | { level: "world" }
  | { level: "country"; countryCode: string; countryLabel: string }
  | {
      level: "region";
      countryCode: string;
      countryLabel: string;
      regionLabel: string;
    };

export type MemoryQueryScope =
  | PlaceScope
  | {
      countryCode: string;
      country: string;
      region?: string | null;
      city?: string | null;
      name: string;
      locationId?: undefined;
    };

export function useMapDataLoader() {
  const [stars, setStars] = useState<MemoryStar[]>([]);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [recent, setRecent] = useState<TracePin[]>([]);
  const [mapLoading, setMapLoading] = useState(true);

  const [geographies, setGeographies] = useState<GeographyAggregate[]>([]);
  const [geoTotals, setGeoTotals] = useState({
    peopleCount: 0,
    activityCount: 0,
  });
  const [geoLoading, setGeoLoading] = useState(false);

  const [posted, setPosted] = useState(false);
  const [mine, setMine] = useState<TracePin | null>(null);
  const [miavId, setMiavId] = useState<string | null>(null);
  const [postedWorkIds, setPostedWorkIds] = useState<string[]>([]);

  const [placeScope, setPlaceScope] = useState<MemoryQueryScope | null>(null);
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
        recent?: TracePin[];
      } | null;
      if (!response.ok) {
        setStars([]);
        setStats(emptyStats());
        setRecent([]);
        return;
      }
      setStars(data?.stars || []);
      setStats(data?.stats || emptyStats());
      setRecent(Array.isArray(data?.recent) ? data.recent.slice(0, 20) : []);
    } finally {
      setMapLoading(false);
    }
  }, []);

  const loadGeo = useCallback(
    async (
      scope: GeoScope,
      categories: TraceCategory[] = [...TRACE_CATEGORIES],
    ) => {
      setGeoLoading(true);
      try {
        const params = new URLSearchParams({
          view: "geo",
          scope: scope.level,
          categories: categories.join(","),
        });
        if (scope.level === "country" || scope.level === "region") {
          params.set("country", scope.countryCode);
        }
        if (scope.level === "region") {
          params.set("region", scope.regionLabel);
        }
        const response = await fetch(`/api/trace?${params.toString()}`);
        const data = (await response.json().catch(() => null)) as {
          geographies?: GeographyAggregate[];
          totals?: { peopleCount: number; activityCount: number };
        } | null;
        if (!response.ok) {
          setGeographies([]);
          setGeoTotals({ peopleCount: 0, activityCount: 0 });
          return;
        }
        setGeographies(Array.isArray(data?.geographies) ? data.geographies : []);
        setGeoTotals(
          data?.totals || { peopleCount: 0, activityCount: 0 },
        );
      } finally {
        setGeoLoading(false);
      }
    },
    [],
  );

  const loadStatus = useCallback(async (user: User | null) => {
    const token = await getIdTokenOrNull(user);
    const params = new URLSearchParams({ view: "status" });
    const response = await fetch(`/api/trace?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = (await response.json().catch(() => null)) as {
      posted?: boolean;
      mine?: TracePin | null;
      miavId?: string | null;
      postedWorkIds?: string[];
    } | null;
    if (!response.ok) {
      if (!token) {
        setPosted(false);
        setMine(null);
        setMiavId(null);
        setPostedWorkIds([]);
      }
      return;
    }
    setPosted(Boolean(data?.posted));
    setMine(data?.mine || null);
    setMiavId(data?.miavId || null);
    setPostedWorkIds(
      Array.isArray(data?.postedWorkIds) ? data.postedWorkIds : [],
    );
  }, []);

  const loadMemories = useCallback(
    async (
      scope: MemoryQueryScope,
      categories?: TraceCategory[],
    ) => {
      setPlaceScope(scope);
      setTracesLoading(true);
      setTraces([]);
      setNextCursor(null);
      setHasMore(false);
      try {
        const params = new URLSearchParams({
          view: "memories",
          limit: String(TRACE_PAGE_SIZE),
        });
        if ("locationId" in scope && scope.locationId) {
          params.set("locationId", scope.locationId);
        } else if ("countryCode" in scope && scope.countryCode) {
          params.set("country", scope.countryCode);
          if (scope.region) params.set("region", scope.region);
          if (scope.city) params.set("city", scope.city);
        }
        if (categories && categories.length > 0) {
          params.set("categories", categories.join(","));
        }
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
    },
    [],
  );

  const loadMoreMemories = useCallback(async () => {
    if (!placeScope || !hasMore || !nextCursor || tracesLoadingMore) return;
    if (!("locationId" in placeScope) || !placeScope.locationId) return;
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
    recent,
    mapLoading,
    loadMap,
    geographies,
    geoTotals,
    geoLoading,
    loadGeo,
    posted,
    mine,
    miavId,
    postedWorkIds,
    setMine,
    setPosted,
    setMiavId,
    setPostedWorkIds,
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
