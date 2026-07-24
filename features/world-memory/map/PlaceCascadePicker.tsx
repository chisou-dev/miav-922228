"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CONTINENTS,
  countriesInContinent,
  fetchCountryLocations,
  fetchLocationIndex,
  type ContinentName,
  type LocationCountry,
  type LocationCountryIndexEntry,
  type LocationRegion,
} from "@/features/world-memory/location/locations/client";
import { WORLD_PLACES } from "@/features/world-memory/location/places/places-data";
import type { WorldPlace } from "@/features/world-memory/location/places/types";

type Props = {
  value: WorldPlace | null;
  onChange: (place: WorldPlace | null) => void;
  onFocusPlace?: (place: WorldPlace) => void;
};

function slugKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Prefer curated CC:slug ids when city name matches (migration-safe). */
function placeFromCatalogCity(
  countryName: string,
  city: { locationId: string; name: string; lat: number; lng: number },
): WorldPlace {
  const cityKey = slugKey(city.name);
  const curated = WORLD_PLACES.find((place) => {
    if (place.country !== countryName) return false;
    return (
      slugKey(place.name) === cityKey ||
      slugKey(place.locationId.split(":").slice(1).join("")) === cityKey
    );
  });
  if (curated) return curated;
  return {
    locationId: city.locationId,
    country: countryName,
    name: city.name,
    lat: city.lat,
    lng: city.lng,
  };
}

function Column({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[180px] min-w-0 flex-1 flex-col border border-[var(--map-line)] bg-white">
      <p className="shrink-0 border-b border-[var(--map-line)] px-3 py-2 text-[0.68rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
        {label}
      </p>
      <ul
        role="listbox"
        aria-label={label}
        className="max-h-[220px] flex-1 overflow-y-auto py-1"
      >
        {children}
      </ul>
    </div>
  );
}

function Row({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onSelect}
        className={`block w-full cursor-pointer px-3 py-2 text-left text-[0.85rem] tracking-[0.02em] transition-colors ${
          selected
            ? "bg-[#e8eef4] text-[var(--map-ink)]"
            : "text-[var(--map-ink)] hover:bg-[#f4f7fa]"
        }`}
      >
        {children}
      </button>
    </li>
  );
}

/**
 * Miller-column place picker: Continent → Country → Region → City.
 * Loads index first; country JSON (regions + cities) only after country select.
 */
export function PlaceCascadePicker({ value, onChange, onFocusPlace }: Props) {
  const [index, setIndex] = useState<LocationCountryIndexEntry[]>([]);
  const [continent, setContinent] = useState<ContinentName | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryData, setCountryData] = useState<LocationCountry | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [loadingCountry, setLoadingCountry] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLocationIndex().then((countries) => {
      if (!cancelled) setIndex(countries);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countryCode) {
      setCountryData(null);
      return;
    }
    let cancelled = false;
    setLoadingCountry(true);
    fetchCountryLocations(countryCode).then((data) => {
      if (cancelled) return;
      setCountryData(data);
      setLoadingCountry(false);
    });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const countries = useMemo(
    () => (continent ? countriesInContinent(index, continent) : []),
    [continent, index],
  );

  const regions: LocationRegion[] = countryData?.regions ?? [];
  const selectedRegion = regions.find((r) => r.name === regionName) ?? null;
  const cities = selectedRegion?.cities ?? [];

  return (
    <div className="space-y-2">
      <p className="text-[0.72rem] tracking-[0.12em] text-[var(--map-muted)]">
        Place
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-nowrap">
        <Column label="Continent">
          {CONTINENTS.filter((c) => c.id !== "Antarctica").map((c) => (
            <Row
              key={c.id}
              selected={continent === c.id}
              onSelect={() => {
                setContinent(c.id);
                setCountryCode(null);
                setRegionName(null);
                onChange(null);
              }}
            >
              {c.name}
            </Row>
          ))}
        </Column>

        <Column label="Country">
          {continent ? (
            countries.map((entry) => (
              <Row
                key={entry.code}
                selected={countryCode === entry.code}
                onSelect={() => {
                  setCountryCode(entry.code);
                  setRegionName(null);
                  onChange(null);
                }}
              >
                {entry.name}
              </Row>
            ))
          ) : (
            <li className="px-3 py-3 text-[0.78rem] text-[var(--map-muted)]">
              Choose a continent
            </li>
          )}
        </Column>

        <Column label="Region">
          {countryCode ? (
            loadingCountry ? (
              <li className="px-3 py-3 text-[0.78rem] text-[var(--map-muted)]">
                Loading…
              </li>
            ) : regions.length > 0 ? (
              regions.map((region) => (
                <Row
                  key={region.name}
                  selected={regionName === region.name}
                  onSelect={() => {
                    setRegionName(region.name);
                    onChange(null);
                  }}
                >
                  {region.name}
                </Row>
              ))
            ) : (
              <li className="px-3 py-3 text-[0.78rem] text-[var(--map-muted)]">
                No regions
              </li>
            )
          ) : (
            <li className="px-3 py-3 text-[0.78rem] text-[var(--map-muted)]">
              {continent ? "Choose a country" : "—"}
            </li>
          )}
        </Column>

        <Column label="City">
          {regionName ? (
            cities.map((city) => {
              const place = placeFromCatalogCity(
                countryData?.name ?? "",
                city,
              );
              const selected = value?.locationId === place.locationId;
              return (
                <Row
                  key={city.locationId}
                  selected={selected}
                  onSelect={() => {
                    onChange(place);
                    onFocusPlace?.(place);
                  }}
                >
                  {city.name}
                </Row>
              );
            })
          ) : (
            <li className="px-3 py-3 text-[0.78rem] text-[var(--map-muted)]">
              {countryCode ? "Choose a region" : "—"}
            </li>
          )}
        </Column>
      </div>

      {value ? (
        <p className="text-[0.8rem] tracking-[0.04em] text-[var(--map-muted)]">
          Selected: {value.name}, {value.country}
          {regionName ? ` · ${regionName}` : ""}
        </p>
      ) : null}
    </div>
  );
}
