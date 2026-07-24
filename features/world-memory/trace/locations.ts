/**
 * Compatibility re-export.
 * Location Database lives in @/features/world-memory/location/locations + data/locations/world.json.
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
} from "@/features/world-memory/location/locations";

export type {
  LocationCity as TraceCity,
  LocationRegion as TraceRegion,
  LocationCountry as TraceCountry,
} from "@/features/world-memory/location/locations/types";
