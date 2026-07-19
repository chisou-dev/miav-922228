"use client";

import { useCallback, useState } from "react";
import type { User } from "firebase/auth";
import {
  fetchCountryLocations,
  fetchLocationIndex,
  type LocationCountry,
  type LocationCountryIndexEntry,
} from "@/lib/locations/client";
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
  locationId: string;
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

function countForCity(
  counts: Record<string, number>,
  city: { locationId: string; name: string },
  country: string,
  region: string,
): number {
  return (
    counts[city.locationId] ||
    counts[`${country}|${region}|${city.name}`] ||
    0
  );
}

/**
 * Lazy-loading data layer for Trace Map.
 * Location shape comes from static JSON; Firestore is Trace counts / traces only.
 */
export function useMapDataLoader() {
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [mine, setMine] = useState<TracePin | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [locationIndex, setLocationIndex] = useState<
    LocationCountryIndexEntry[]
  >([]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [countryCatalog, setCountryCatalog] = useState<LocationCountry | null>(
    null,
  );
  const [countMap, setCountMap] = useState<Record<string, number>>({});

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

  const loadLocationIndex = useCallback(async () => {
    setIndexLoading(true);
    try {
      const countries = await fetchLocationIndex();
      setLocationIndex(countries);
    } catch {
      setLocationIndex([]);
    } finally {
      setIndexLoading(false);
    }
  }, []);

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

  const loadCountry = useCallback(async (entry: LocationCountryIndexEntry) => {
    setRegionsLoading(true);
    setRegionsCountry(entry.name);
    setCities([]);
    setCitiesScope(null);
    setCityScope(null);
    setTraces([]);
    setNextCursor(null);
    setHasMore(false);
    setSelectedTrace(null);
    try {
      const [catalog, countsRes] = await Promise.all([
        fetchCountryLocations(entry.path || entry.code),
        fetch(
          `/api/trace?view=counts&country=${encodeURIComponent(entry.name)}`,
        ),
      ]);
      const countsData = (await countsRes.json().catch(() => null)) as {
        counts?: Record<string, number>;
      } | null;
      const counts =
        countsRes.ok && countsData?.counts ? countsData.counts : {};
      setCountryCatalog(catalog);
      setCountMap(counts);

      if (!catalog) {
        setRegions([]);
        return;
      }

      setRegions(
        catalog.regions.map((region) => ({
          name: region.name,
          lat: region.lat,
          lng: region.lng,
          count: region.cities.reduce(
            (sum, city) =>
              sum + countForCity(counts, city, catalog.name, region.name),
            0,
          ),
        })),
      );
    } catch {
      setRegions([]);
      setCountryCatalog(null);
      setCountMap({});
    } finally {
      setRegionsLoading(false);
    }
  }, []);

  const loadCities = useCallback(
    async (countryName: string, regionName: string) => {
      setCitiesLoading(true);
      setCitiesScope({ country: countryName, region: regionName });
      setCityScope(null);
      setTraces([]);
      setNextCursor(null);
      setHasMore(false);
      setSelectedTrace(null);
      try {
        let catalog = countryCatalog;
        if (!catalog || catalog.name !== countryName) {
          const entry = locationIndex.find((c) => c.name === countryName);
          catalog = entry
            ? await fetchCountryLocations(entry.path || entry.code)
            : null;
          setCountryCatalog(catalog);
        }
        if (!catalog) {
          setCities([]);
          return;
        }
        const region = catalog.regions.find((r) => r.name === regionName);
        if (!region) {
          setCities([]);
          return;
        }
        setCities(
          region.cities.map((city) => ({
            locationId: city.locationId,
            name: city.name,
            lat: city.lat,
            lng: city.lng,
            count: countForCity(countMap, city, catalog!.name, region.name),
          })),
        );
      } catch {
        setCities([]);
      } finally {
        setCitiesLoading(false);
      }
    },
    [countryCatalog, countMap, locationIndex],
  );

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
        locationId: cityScope.locationId,
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

  const refreshCounts = useCallback(async (countryName: string) => {
    try {
      const response = await fetch(
        `/api/trace?view=counts&country=${encodeURIComponent(countryName)}`,
      );
      const data = (await response.json().catch(() => null)) as {
        counts?: Record<string, number>;
      } | null;
      if (!response.ok || !data?.counts) return;
      setCountMap(data.counts);
      setCountryCatalog((catalog) => {
        if (!catalog || catalog.name !== countryName) return catalog;
        setRegions(
          catalog.regions.map((region) => ({
            name: region.name,
            lat: region.lat,
            lng: region.lng,
            count: region.cities.reduce(
              (sum, city) =>
                sum +
                countForCity(data.counts!, city, catalog.name, region.name),
              0,
            ),
          })),
        );
        setCitiesScope((scope) => {
          if (!scope || scope.country !== countryName) return scope;
          const region = catalog.regions.find((r) => r.name === scope.region);
          if (region) {
            setCities(
              region.cities.map((city) => ({
                locationId: city.locationId,
                name: city.name,
                lat: city.lat,
                lng: city.lng,
                count: countForCity(
                  data.counts!,
                  city,
                  catalog.name,
                  region.name,
                ),
              })),
            );
          }
          return scope;
        });
        return catalog;
      });
    } catch {
      // non-fatal
    }
  }, []);

  return {
    stats,
    mine,
    setMine,
    overviewLoading,
    loadOverview,
    locationIndex,
    indexLoading,
    loadLocationIndex,
    countryCatalog,
    loadCountry,
    regions,
    regionsLoading,
    regionsCountry,
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
    refreshCounts,
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
