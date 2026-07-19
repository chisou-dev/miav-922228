/**
 * Location Database types — static JSON only (not Firestore).
 */

export type ContinentName =
  | "Asia"
  | "Europe"
  | "Africa"
  | "North America"
  | "South America"
  | "Oceania"
  | "Antarctica";

export type LocationRecord = {
  locationId: string;
  continent: ContinentName | string;
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
  continent: ContinentName | string;
  lat: number;
  lng: number;
  zoom: number;
  regions: LocationRegion[];
};

export type LocationCountryIndexEntry = {
  code: string;
  name: string;
  continent: ContinentName | string;
  lat: number;
  lng: number;
  zoom: number;
  path: string;
};

export type LocationIndex = {
  version: number;
  description?: string;
  continents?: string[];
  countries: LocationCountryIndexEntry[];
};
