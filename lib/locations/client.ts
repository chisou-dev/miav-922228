/**
 * Browser Location Database helpers — static JSON from Vercel only.
 * Never imports the full catalog; load index + per-country files on demand.
 */

import type {
  LocationCountry,
  LocationCountryIndexEntry,
} from "@/lib/locations/types";

export type { LocationCountry, LocationCountryIndexEntry };

export async function fetchLocationIndex(): Promise<
  LocationCountryIndexEntry[]
> {
  const res = await fetch("/locations/index.json", { cache: "force-cache" });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    countries?: LocationCountryIndexEntry[];
  };
  return data.countries || [];
}

export async function fetchCountryLocations(
  codeOrPath: string,
): Promise<LocationCountry | null> {
  const path = codeOrPath.includes("/")
    ? codeOrPath
    : `/locations/countries/${codeOrPath.toUpperCase()}.json`;
  const res = await fetch(path, { cache: "force-cache" });
  if (!res.ok) return null;
  return (await res.json()) as LocationCountry;
}
