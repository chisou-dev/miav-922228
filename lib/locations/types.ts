/**
 * Location Database types — static JSON only (not Firestore).
 */

export type LocationRecord = {
  locationId: string;
  countryCode: string;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
};

export type LocationCity = {
  locationId: string;
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

export type LocationCountryIndexEntry = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  path: string;
};

export type LocationIndex = {
  version: number;
  description?: string;
  countries: LocationCountryIndexEntry[];
};
