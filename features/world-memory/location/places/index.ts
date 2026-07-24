import { WORLD_PLACES } from "@/features/world-memory/location/places/places-data";
import type { WorldPlace } from "@/features/world-memory/location/places/types";
import { getLocationById } from "@/features/world-memory/location/locations";

const byId = new Map(WORLD_PLACES.map((place) => [place.locationId, place]));

export function listPlaces(): WorldPlace[] {
  return WORLD_PLACES;
}

/** Curated CC:slug places only (existing memory / star ids). */
export function getCuratedPlaceById(
  locationId: string,
): WorldPlace | undefined {
  const id = locationId.trim();
  if (!id) return undefined;
  return byId.get(id);
}

/**
 * Resolve a selectable / star place id.
 * Supports curated CC:slug ids and hierarchical catalog CC:region:city ids.
 * Existing curated ids take precedence (migration-safe).
 */
export function getPlaceById(locationId: string): WorldPlace | undefined {
  const curated = getCuratedPlaceById(locationId);
  if (curated) return curated;

  const id = locationId.trim();
  if (!id) return undefined;

  const record = getLocationById(id);
  if (!record) return undefined;

  return {
    locationId: record.locationId,
    country: record.country,
    name: record.city,
    lat: record.lat,
    lng: record.lng,
  };
}

/**
 * Prefer a curated place id when the catalog city matches an existing place
 * in the same country (keeps Leave Memory / stars compatible).
 * Server-side helper; client picker duplicates a lightweight name match.
 */
export function preferCuratedPlaceId(
  catalogLocationId: string,
): WorldPlace | undefined {
  const record = getLocationById(catalogLocationId.trim());
  if (!record) return getPlaceById(catalogLocationId);

  const citySlug = record.city
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  const curated = WORLD_PLACES.find((place) => {
    if (place.country !== record.country) return false;
    const nameSlug = place.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    const idSlug = place.locationId
      .split(":")
      .slice(1)
      .join("")
      .replace(/[^a-z0-9]+/g, "");
    return nameSlug === citySlug || idSlug === citySlug;
  });

  if (curated) return curated;

  return {
    locationId: record.locationId,
    country: record.country,
    name: record.city,
    lat: record.lat,
    lng: record.lng,
  };
}

export function placeToTraceFields(place: WorldPlace) {
  const record = getLocationById(place.locationId);
  return {
    locationId: place.locationId,
    country: place.country,
    region: record?.region ?? "",
    city: place.name,
    lat: place.lat,
    lng: place.lng,
  };
}
