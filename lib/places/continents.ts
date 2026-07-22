import { WORLD_PLACES } from "@/lib/places/places-data";
import type { WorldPlace } from "@/lib/places/types";

/** Five continents for the place cascade picker. */
export const PLACE_CONTINENTS = [
  "Asia",
  "Europe",
  "Africa",
  "Americas",
  "Oceania",
] as const;

export type PlaceContinent = (typeof PLACE_CONTINENTS)[number];

const COUNTRY_CONTINENT: Record<string, PlaceContinent> = {
  Japan: "Asia",
  "South Korea": "Asia",
  Taiwan: "Asia",
  China: "Asia",
  "Hong Kong": "Asia",
  Mongolia: "Asia",
  Thailand: "Asia",
  Vietnam: "Asia",
  Malaysia: "Asia",
  Singapore: "Asia",
  Indonesia: "Asia",
  Philippines: "Asia",
  India: "Asia",
  Pakistan: "Asia",
  Bangladesh: "Asia",
  "Sri Lanka": "Asia",
  Nepal: "Asia",
  Myanmar: "Asia",
  Cambodia: "Asia",
  Kazakhstan: "Asia",
  Uzbekistan: "Asia",
  Georgia: "Asia",
  Turkey: "Asia",
  Israel: "Asia",
  "United Arab Emirates": "Asia",
  "Saudi Arabia": "Asia",
  Qatar: "Asia",
  Iran: "Asia",
  Jordan: "Asia",
  Russia: "Europe",
  "United Kingdom": "Europe",
  France: "Europe",
  Germany: "Europe",
  Italy: "Europe",
  Spain: "Europe",
  Netherlands: "Europe",
  Belgium: "Europe",
  Switzerland: "Europe",
  Austria: "Europe",
  Sweden: "Europe",
  Norway: "Europe",
  Denmark: "Europe",
  Finland: "Europe",
  Poland: "Europe",
  "Czech Republic": "Europe",
  Hungary: "Europe",
  Greece: "Europe",
  Portugal: "Europe",
  Ireland: "Europe",
  Iceland: "Europe",
  Ukraine: "Europe",
  Romania: "Europe",
  Croatia: "Europe",
  Serbia: "Europe",
  Estonia: "Europe",
  Latvia: "Europe",
  Lithuania: "Europe",
  Egypt: "Africa",
  Morocco: "Africa",
  "South Africa": "Africa",
  Nigeria: "Africa",
  Kenya: "Africa",
  Ethiopia: "Africa",
  Tunisia: "Africa",
  Algeria: "Africa",
  Ghana: "Africa",
  Senegal: "Africa",
  Tanzania: "Africa",
  Mauritius: "Africa",
  "United States": "Americas",
  Canada: "Americas",
  Mexico: "Americas",
  Brazil: "Americas",
  Argentina: "Americas",
  Chile: "Americas",
  Colombia: "Americas",
  Peru: "Americas",
  Cuba: "Americas",
  "Puerto Rico": "Americas",
  Greenland: "Americas",
  Australia: "Oceania",
  "New Zealand": "Oceania",
  Fiji: "Oceania",
};

export function continentForCountry(country: string): PlaceContinent | null {
  return COUNTRY_CONTINENT[country] ?? null;
}

export function countriesForContinent(continent: PlaceContinent): string[] {
  const set = new Set<string>();
  for (const place of WORLD_PLACES) {
    if (continentForCountry(place.country) === continent) {
      set.add(place.country);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function placesForCountry(country: string): WorldPlace[] {
  return WORLD_PLACES.filter((place) => place.country === country).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function findPlaceCascade(locationId: string): {
  continent: PlaceContinent;
  country: string;
  place: WorldPlace;
} | null {
  const place = WORLD_PLACES.find((p) => p.locationId === locationId);
  if (!place) return null;
  const continent = continentForCountry(place.country);
  if (!continent) return null;
  return { continent, country: place.country, place };
}
