/**
 * Compatibility re-export.
 * Location Database lives in @/lib/locations + data/locations/world.json.
 * Trace documents remain in Firestore (trace_map / trace_locations).
 */
export {
  LOCATION_COUNTRIES,
  TRACE_COUNTRIES,
  findCountry,
  findRegion,
  findCity,
  resolveLocationCoords,
  matchCountryFromGeo,
  nearestCityInCountry,
  listLocationCountries,
} from "@/lib/locations";

export type {
  LocationCity as TraceCity,
  LocationRegion as TraceRegion,
  LocationCountry as TraceCountry,
} from "@/lib/locations/types";
