/**
 * Pure pin → aggregate row mapping (no Firestore / no server-only).
 * Legacy uncategorized pins return null.
 */

import {
  findCountry,
  getLocationById,
} from "@/features/world-memory/location/locations";
import { getPlaceById } from "@/features/world-memory/location/places";
import type { AggregateMemoryRow } from "@/features/world-memory/trace/aggregate";
import { isTraceCategory } from "@/features/world-memory/trace/works";
import type { TracePin } from "@/features/world-memory/trace/types";

function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Resolve country / region / city labels from catalog — never invent category.
 * Returns null when the row cannot be placed safely on the geography map.
 */
export function rowFromCategorizedPin(pin: TracePin): AggregateMemoryRow | null {
  if (!pin.category || !isTraceCategory(pin.category) || !pin.workId) {
    return null;
  }
  if (!pin.miavId?.startsWith("MIAV-")) return null;

  let countryCode = "";
  let countryLabel = pin.country || "";
  let regionLabel = pin.region || "";
  let cityLabel = pin.city || "";
  let catalogLocationId: string | null = pin.locationId;

  if (pin.locationId) {
    const loc = getLocationById(pin.locationId);
    if (loc) {
      countryCode = loc.countryCode;
      countryLabel = loc.country;
      if (!regionLabel) regionLabel = loc.region;
      if (!cityLabel) cityLabel = loc.city;
      catalogLocationId = loc.locationId;
    } else {
      const place = getPlaceById(pin.locationId);
      if (place) {
        countryLabel = place.country || countryLabel;
        const fromPlace = findCountry(place.country);
        if (fromPlace) countryCode = fromPlace.code;
        const prefix = pin.locationId.split(":")[0]?.toUpperCase();
        if (!countryCode && prefix && /^[A-Z]{2}$/.test(prefix)) {
          countryCode = prefix;
        }
        if (!cityLabel) cityLabel = place.name || "";
      }
    }
  }

  if (!countryCode) {
    const country = findCountry(pin.country);
    if (country) {
      countryCode = country.code;
      countryLabel = country.name;
    }
  }

  if (!countryCode) return null;

  // Region fallback: city name (legacy / curated 2-part places).
  if (!regionLabel) {
    regionLabel = cityLabel || "Unknown";
  }
  if (!cityLabel) {
    cityLabel = regionLabel;
  }

  return {
    miavId: pin.miavId,
    category: pin.category,
    workId: pin.workId,
    countryCode: countryCode.toUpperCase(),
    countryLabel: countryLabel || countryCode,
    regionKey: slugPart(regionLabel) || "unknown",
    regionLabel,
    cityKey: slugPart(cityLabel) || "unknown",
    cityLabel,
    locationId: catalogLocationId,
  };
}
