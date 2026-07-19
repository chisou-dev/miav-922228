/**
 * Browser Location Database helpers — static JSON from Vercel only.
 * Never imports the full catalog; load index + per-country files on demand.
 */

import type {
  ContinentName,
  LocationCountry,
  LocationCountryIndexEntry,
} from "@/lib/locations/types";
import { CONTINENTS } from "@/lib/locations/continents";

export type { LocationCountry, LocationCountryIndexEntry, ContinentName };
export { CONTINENTS };

export async function fetchLocationIndex(): Promise<
  LocationCountryIndexEntry[]
> {
  const res = await fetch("/locations/index.json", { cache: "force-cache" });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    countries?: LocationCountryIndexEntry[];
  };
  return (data.countries || []).map((c) => ({
    ...c,
    continent: c.continent || "Asia",
  }));
}

export async function fetchCountryLocations(
  codeOrPath: string,
): Promise<LocationCountry | null> {
  const path = codeOrPath.includes("/")
    ? codeOrPath
    : `/locations/countries/${codeOrPath.toUpperCase()}.json`;
  const res = await fetch(path, { cache: "force-cache" });
  if (!res.ok) return null;
  const data = (await res.json()) as LocationCountry;
  return {
    ...data,
    continent: data.continent || "Asia",
  };
}

export function countriesInContinent(
  index: LocationCountryIndexEntry[],
  continent: string,
): LocationCountryIndexEntry[] {
  return index
    .filter((c) => (c.continent || "Asia") === continent)
    .sort((a, b) => a.name.localeCompare(b.name));
}
