/**
 * Location Database types — independent from Trace documents.
 * Expand via data/locations/world.json.
 */

export type LocationCity = {
  name: string;
  lat: number;
  lng: number;
};

export type LocationRegion = {
  name: string;
  lat: number;
  lng: number;
  cities: LocationCity[];
};

export type LocationCountry = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  regions: LocationRegion[];
};

export type LocationWorldCatalog = {
  version: number;
  description?: string;
  countries: LocationCountry[];
};
