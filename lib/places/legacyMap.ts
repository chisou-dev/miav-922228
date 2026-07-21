import flatCatalog from "@/data/locations/locations.json";
import { getLocationById as getLegacyLocationById } from "@/lib/locations";
import { WORLD_PLACES } from "@/lib/places/places-data";
import { getPlaceById } from "@/lib/places/index";

/** Legacy CC:region prefix → new catalog locationId */
const PREFIX_TO_CANONICAL: Record<string, string> = {
  "JP:tokyo": "JP:tokyo",
  "JP:osaka": "JP:osaka",
  "JP:fukuoka": "JP:fukuoka",
  "JP:okinawa": "JP:okinawa",
  "JP:hokkaido": "JP:hokkaido",
  "JP:kyoto": "JP:osaka",
  "US:new-york": "US:nyc",
  "US:illinois": "US:chicago",
  "US:hawaii": "US:hawaii",
  "GB:england": "GB:london",
  "FR:ile-de-france": "FR:paris",
  "KR:seoul": "KR:seoul",
  "TW:taipei": "TW:taipei",
  "AU:new-south-wales": "AU:sydney",
  "AU:victoria": "AU:melbourne",
  "CA:ontario": "CA:toronto",
  "CA:british-columbia": "CA:vancouver",
  "DE:berlin": "DE:berlin",
  "DE:bavaria": "DE:munich",
  "IT:lazio": "IT:rome",
  "IT:lombardy": "IT:milan",
  "ES:madrid": "ES:madrid",
  "ES:catalonia": "ES:barcelona",
  "NL:north-holland": "NL:amsterdam",
  "BE:brussels": "BE:brussels",
  "CH:zurich": "CH:zurich",
  "AT:vienna": "AT:vienna",
  "SE:stockholm": "SE:stockholm",
  "NO:oslo": "NO:oslo",
  "DK:capital-region": "DK:copenhagen",
  "FI:uusimaa": "FI:helsinki",
  "PL:mazovia": "PL:warsaw",
  "CZ:prague": "CZ:prague",
  "HU:budapest": "HU:budapest",
  "GR:attica": "GR:athens",
  "PT:lisbon": "PT:lisbon",
  "IE:dublin": "IE:dublin",
  "RU:moscow": "RU:moscow",
  "RU:saint-petersburg": "RU:saintpetersburg",
  "TR:istanbul": "TR:istanbul",
  "IL:tel-aviv": "IL:telaviv",
  "AE:dubai": "AE:dubai",
  "SA:riyadh": "SA:riyadh",
  "IN:maharashtra": "IN:mumbai",
  "IN:national-capital-territory": "IN:delhi",
  "IN:karnataka": "IN:bangalore",
  "PK:sindh": "PK:karachi",
  "BD:dhaka": "BD:dhaka",
  "TH:bangkok": "TH:bangkok",
  "VN:hanoi": "VN:hanoi",
  "VN:ho-chi-minh": "VN:hochiminh",
  "MY:kuala-lumpur": "MY:kualalumpur",
  "SG:singapore": "SG:singapore",
  "ID:jakarta": "ID:jakarta",
  "PH:metro-manila": "PH:manila",
  "CN:beijing": "CN:beijing",
  "CN:shanghai": "CN:shanghai",
  "CN:hong-kong": "HK:hongkong",
  "MN:ulaanbaatar": "MN:ulaanbaatar",
  "KZ:almaty": "KZ:almaty",
  "NZ:auckland": "NZ:auckland",
  "NZ:wellington": "NZ:wellington",
  "MX:mexico-city": "MX:mexicocity",
  "MX:quintana-roo": "MX:cancun",
  "BR:sao-paulo": "BR:saopaulo",
  "BR:rio-de-janeiro": "BR:rio",
  "AR:buenos-aires": "AR:buenosaires",
  "CL:santiago-metropolitan": "CL:santiago",
  "CO:bogota": "CO:bogota",
  "PE:lima": "PE:lima",
  "EG:cairo": "EG:cairo",
  "MA:casablanca": "MA:casablanca",
  "ZA:western-cape": "ZA:capeTown",
  "ZA:gauteng": "ZA:johannesburg",
  "NG:lagos": "NG:lagos",
  "KE:nairobi": "KE:nairobi",
  "ET:addis-ababa": "ET:addisababa",
  "IS:capital-region": "IS:reykjavik",
  "GL:sermersooq": "GL:nuuk",
  "CU:havana": "CU:havana",
  "PR:san-juan": "PR:sanjuan",
  "QA:doha": "QA:doha",
  "IR:tehran": "IR:tehran",
  "JO:amman": "JO:amman",
  "LK:western": "LK:colombo",
  "NP:kathmandu": "NP:kathmandu",
  "MM:yangon": "MM:yangon",
  "KH:phnom-penh": "KH:phnompenh",
  "UZ:tashkent": "UZ:tashkent",
  "GE:tbilisi": "GE:tbilisi",
  "UA:kyiv": "UA:kyiv",
  "RO:bucharest": "RO:bucharest",
  "HR:zagreb": "HR:zagreb",
  "RS:belgrade": "RS:belgrade",
  "EE:harju": "EE:tallinn",
  "LV:riga": "LV:riga",
  "LT:vilnius": "LT:vilnius",
  "TN:tunis": "TN:tunis",
  "DZ:algiers": "DZ:algiers",
  "GH:greater-accra": "GH:accra",
  "SN:dakar": "SN:dakar",
  "TZ:dar-es-salaam": "TZ:dar",
  "MU:port-louis": "MU:portlouis",
  "FJ:central": "FJ:suva",
};

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function placesForCountry(country: string, countryCode?: string) {
  const code = countryCode?.toUpperCase();
  return WORLD_PLACES.filter(
    (place) =>
      place.country === country ||
      (code && place.locationId.startsWith(`${code}:`)),
  );
}

function matchPlaceByName(country: string, name: string, countryCode?: string) {
  const target = slug(name);
  return placesForCountry(country, countryCode).find(
    (place) =>
      slug(place.name) === target ||
      slug(place.locationId.split(":").slice(1).join("-")) === target,
  );
}

/**
 * Map a stored locationId (legacy or new) to a new-catalog place id.
 * Firestore documents are never modified — API aggregation only.
 */
export function canonicalPlaceId(legacyId: string | null | undefined): string | null {
  const id = (legacyId || "").trim();
  if (!id) return null;
  if (getPlaceById(id)) return id;

  const parts = id.split(":");
  if (parts.length >= 2) {
    const prefix = `${parts[0]}:${parts[1]}`;
    const cityPart = parts[2] || "";

    if (prefix === "US:california") {
      if (cityPart === "san-francisco") return "US:sanfrancisco";
      if (cityPart === "los-angeles") return "US:la";
      return "US:la";
    }

    const mapped = PREFIX_TO_CANONICAL[prefix];
    if (mapped && getPlaceById(mapped)) return mapped;
  }

  const legacy = getLegacyLocationById(id);
  if (!legacy) return null;

  const byCity = matchPlaceByName(
    legacy.country,
    legacy.city,
    legacy.countryCode,
  );
  if (byCity) return byCity.locationId;

  const byRegion = matchPlaceByName(
    legacy.country,
    legacy.region,
    legacy.countryCode,
  );
  if (byRegion) return byRegion.locationId;

  const catalogSuffix = slug(legacy.region);
  const bySuffix = placesForCountry(legacy.country, legacy.countryCode).find(
    (place) => {
      const suffix = place.locationId.split(":").slice(1).join(":");
      return slug(suffix) === catalogSuffix;
    },
  );
  if (bySuffix) return bySuffix.locationId;

  return null;
}

function buildLegacyIndex(): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  for (const place of WORLD_PLACES) {
    index.set(place.locationId, new Set([place.locationId]));
  }

  const flat = flatCatalog as {
    locations: Array<{ locationId: string }>;
  };

  for (const loc of flat.locations) {
    const canonical = canonicalPlaceId(loc.locationId);
    if (!canonical) continue;
    if (!index.has(canonical)) index.set(canonical, new Set());
    index.get(canonical)!.add(loc.locationId);
  }

  return index;
}

let legacyIndexCache: Map<string, Set<string>> | null = null;

export function legacyIdsForCanonical(canonicalId: string): string[] {
  if (!legacyIndexCache) legacyIndexCache = buildLegacyIndex();
  const set = legacyIndexCache.get(canonicalId);
  return set ? [...set] : [canonicalId];
}

/** @internal tests */
export function resetLegacyIndexCache() {
  legacyIndexCache = null;
}
