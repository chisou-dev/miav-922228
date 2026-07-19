import worldCatalog from "@/data/locations/world.json";
import type {
  LocationCity,
  LocationCountry,
  LocationRegion,
  LocationWorldCatalog,
} from "@/lib/locations/types";

const catalog = worldCatalog as LocationWorldCatalog;

/**
 * Static Location Database (capitals / major regions / major cities).
 * Not derived from Trace presence — Trace data stays in Firestore.
 */
export const LOCATION_COUNTRIES: LocationCountry[] = catalog.countries;

/** @deprecated Prefer LOCATION_COUNTRIES — alias for existing Trace Map imports. */
export const TRACE_COUNTRIES = LOCATION_COUNTRIES;

export type { LocationCity, LocationCountry, LocationRegion } from "@/lib/locations/types";

export function listLocationCountries(): LocationCountry[] {
  return LOCATION_COUNTRIES;
}

export function findCountry(nameOrCode: string): LocationCountry | undefined {
  const q = nameOrCode.trim().toLowerCase();
  return LOCATION_COUNTRIES.find(
    (c) => c.name.toLowerCase() === q || c.code.toLowerCase() === q,
  );
}

export function findRegion(
  country: LocationCountry,
  regionName: string,
): LocationRegion | undefined {
  const q = regionName.trim().toLowerCase();
  return country.regions.find((r) => r.name.toLowerCase() === q);
}

export function findCity(
  region: LocationRegion,
  cityName: string,
): LocationCity | undefined {
  const q = cityName.trim().toLowerCase();
  return region.cities.find((c) => c.name.toLowerCase() === q);
}

export function resolveLocationCoords(input: {
  country: string;
  region: string;
  city: string;
}): { lat: number; lng: number; zoom: number } | null {
  const country = findCountry(input.country);
  if (!country) return null;
  const region = findRegion(country, input.region);
  if (!region) {
    return { lat: country.lat, lng: country.lng, zoom: country.zoom };
  }
  const city = findCity(region, input.city);
  if (!city) {
    return {
      lat: region.lat,
      lng: region.lng,
      zoom: Math.min(country.zoom + 3, 10),
    };
  }
  return { lat: city.lat, lng: city.lng, zoom: 11 };
}

/** Map ISO / common names from IP lookup onto the Location Database. */
export function matchCountryFromGeo(input: {
  countryCode?: string | null;
  countryName?: string | null;
}): LocationCountry | undefined {
  const code = input.countryCode?.trim().toUpperCase();
  if (code) {
    const byCode = LOCATION_COUNTRIES.find((c) => c.code === code);
    if (byCode) return byCode;
  }
  const name = input.countryName?.trim();
  if (name) return findCountry(name);
  return undefined;
}

export function nearestCityInCountry(
  country: LocationCountry,
  lat: number,
  lng: number,
): { region: LocationRegion; city: LocationCity } | null {
  let best: { region: LocationRegion; city: LocationCity; dist: number } | null =
    null;
  for (const region of country.regions) {
    for (const city of region.cities) {
      const dist =
        (city.lat - lat) * (city.lat - lat) +
        (city.lng - lng) * (city.lng - lng);
      if (!best || dist < best.dist) {
        best = { region, city, dist };
      }
    }
  }
  return best ? { region: best.region, city: best.city } : null;
}
