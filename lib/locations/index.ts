import flatCatalog from "@/data/locations/locations.json";
import type {
  LocationCity,
  LocationCountry,
  LocationCountryIndexEntry,
  LocationRecord,
  LocationRegion,
} from "@/lib/locations/types";

type FlatFile = {
  version: number;
  countries: Array<{
    code: string;
    name: string;
    lat: number;
    lng: number;
    zoom: number;
  }>;
  locations: LocationRecord[];
};

const flat = flatCatalog as FlatFile;

const byId = new Map<string, LocationRecord>();
const byTriple = new Map<string, LocationRecord>();

for (const loc of flat.locations) {
  byId.set(loc.locationId, loc);
  byTriple.set(tripleKey(loc.country, loc.region, loc.city), loc);
}

function tripleKey(country: string, region: string, city: string): string {
  return [country, region, city].map((p) => p.trim().toLowerCase()).join("|");
}

function slug(s: string): string {
  return String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildLocationId(
  countryCode: string,
  region: string,
  city: string,
): string {
  return `${countryCode.toUpperCase()}:${slug(region)}:${slug(city)}`;
}

export function getLocationById(locationId: string): LocationRecord | undefined {
  return byId.get(locationId.trim());
}

export function findLocationByNames(input: {
  country: string;
  region: string;
  city: string;
}): LocationRecord | undefined {
  return byTriple.get(tripleKey(input.country, input.region, input.city));
}

export function listAllLocations(): LocationRecord[] {
  return flat.locations;
}

function groupCountries(): LocationCountry[] {
  const map = new Map<string, LocationCountry>();

  for (const meta of flat.countries) {
    map.set(meta.code, {
      code: meta.code,
      name: meta.name,
      lat: meta.lat,
      lng: meta.lng,
      zoom: meta.zoom,
      regions: [],
    });
  }

  for (const loc of flat.locations) {
    const country = map.get(loc.countryCode);
    if (!country) continue;
    let region = country.regions.find((r) => r.name === loc.region);
    if (!region) {
      region = {
        name: loc.region,
        lat: loc.lat,
        lng: loc.lng,
        cities: [],
      };
      country.regions.push(region);
    }
    if (!region.cities.some((c) => c.locationId === loc.locationId)) {
      region.cities.push({
        locationId: loc.locationId,
        name: loc.city,
        lat: loc.lat,
        lng: loc.lng,
      });
    }
  }

  return [...map.values()];
}

export const LOCATION_COUNTRIES: LocationCountry[] = groupCountries();
export const TRACE_COUNTRIES = LOCATION_COUNTRIES;

export type { LocationCity, LocationCountry, LocationRegion, LocationRecord };

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
  const hit = findLocationByNames(input);
  if (hit) return { lat: hit.lat, lng: hit.lng, zoom: 11 };
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

export {
  fetchLocationIndex,
  fetchCountryLocations,
} from "@/lib/locations/client";
