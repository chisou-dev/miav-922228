"use client";

import { useCallback, useState } from "react";
import type { User } from "firebase/auth";
import { getIdTokenOrNull } from "@/lib/trace/auth";
import {
  TRACE_PAGE_SIZE,
  type TraceCityMarker,
  type TracePin,
  type TraceRegionMarker,
  type TraceStats,
} from "@/lib/trace/types";

export type MapFocus = {
  lat: number;
  lng: number;
  zoom: number;
} | null;

export type CityScope = {
  country: string;
  region: string;
  city: string;
};

function emptyStats(): TraceStats {
  return {
    countryCount: 0,
    cityCount: 0,
    permanentCount: 0,
    temporaryCount: 0,
    first: null,
    latest: null,
  };
}

/**
 * Lazy-loading data layer for Trace Map.
 * Overview loads stats only; regions / cities / traces load on demand.
 */
export function useMapDataLoader() {
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [mine, setMine] = useState<TracePin | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [regions, setRegions] = useState<TraceRegionMarker[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [regionsCountry, setRegionsCountry] = useState<string | null>(null);

  const [cities, setCities] = useState<TraceCityMarker[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesScope, setCitiesScope] = useState<{
    country: string;
    region: string;
  } | null>(null);

  const [cityScope, setCityScope] = useState<CityScope | null>(null);
  const [traces, setTraces] = useState<TracePin[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [tracesLoadingMore, setTracesLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<TracePin | null>(null);

  const loadOverview = useCallback(async (active: User | null) => {
    setOverviewLoading(true);
    try {
      const token = await getIdTokenOrNull(active);
      const response = await fetch("/api/trace?view=overview", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = (await response.json().catch(() => null)) as {
        stats?: TraceStats;
        mine?: TracePin | null;
      } | null;
      if (!response.ok) {
        setStats(emptyStats());
        setMine(null);
        return;
      }
      setStats(data?.stats || emptyStats());
      setMine(data?.mine || null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadRegions = useCallback(async (country: string) => {
    setRegionsLoading(true);
    setRegionsCountry(country);
    setCities([]);
    setCitiesScope(null);
    setCityScope(null);
    setTraces([]);
    setNextCursor(null);
    setHasMore(false);
    setSelectedTrace(null);
    try {
      const response = await fetch(
        `/api/trace?view=regions&country=${encodeURIComponent(country)}`,
      );
      const data = (await response.json().catch(() => null)) as {
        regions?: TraceRegionMarker[];
      } | null;
      setRegions(response.ok ? data?.regions || [] : []);
    } catch {
      setRegions([]);
    } finally {
      setRegionsLoading(false);
    }
  }, []);

  const loadCities = useCallback(async (country: string, region: string) => {
    setCitiesLoading(true);
    setCitiesScope({ country, region });
    setCityScope(null);
    setTraces([]);
    setNextCursor(null);
    setHasMore(false);
    setSelectedTrace(null);
    try {
      const params = new URLSearchParams({
        view: "cities",
        country,
        region,
      });
      const response = await fetch(`/api/trace?${params.toString()}`);
      const data = (await response.json().catch(() => null)) as {
        cities?: TraceCityMarker[];
      } | null;
      setCities(response.ok ? data?.cities || [] : []);
    } catch {
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  const loadCityTraces = useCallback(async (scope: CityScope) => {
    setCityScope(scope);
    setTracesLoading(true);
    setTraces([]);
    setNextCursor(null);
    setHasMore(false);
    setSelectedTrace(null);
    try {
      const params = new URLSearchParams({
        view: "traces",
        country: scope.country,
        region: scope.region,
        city: scope.city,
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
      const next = data?.traces || [];
      setTraces(next);
      setNextCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
      setSelectedTrace(next[0] || null);
    } catch {
      setTraces([]);
    } finally {
      setTracesLoading(false);
    }
  }, []);

  const loadMoreTraces = useCallback(async () => {
    if (!cityScope || !hasMore || !nextCursor || tracesLoadingMore) return;
    setTracesLoadingMore(true);
    try {
      const params = new URLSearchParams({
        view: "traces",
        country: cityScope.country,
        region: cityScope.region,
        city: cityScope.city,
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
      const page = data?.traces || [];
      setTraces((current) => [...current, ...page]);
      setNextCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } finally {
      setTracesLoadingMore(false);
    }
  }, [cityScope, hasMore, nextCursor, tracesLoadingMore]);

  const closeViewer = useCallback(() => {
    setCityScope(null);
    setTraces([]);
    setNextCursor(null);
    setHasMore(false);
    setSelectedTrace(null);
  }, []);

  return {
    stats,
    mine,
    setMine,
    overviewLoading,
    loadOverview,
    regions,
    regionsLoading,
    regionsCountry,
    loadRegions,
    cities,
    citiesLoading,
    citiesScope,
    loadCities,
    cityScope,
    traces,
    tracesLoading,
    tracesLoadingMore,
    hasMore,
    loadCityTraces,
    loadMoreTraces,
    selectedTrace,
    setSelectedTrace,
    closeViewer,
  };
}

export type MapDataLoaderApi = ReturnType<typeof useMapDataLoader>;

export function MapDataLoader({
  children,
}: {
  children: (api: MapDataLoaderApi) => React.ReactNode;
}) {
  const api = useMapDataLoader();
  return <>{children(api)}</>;
}
