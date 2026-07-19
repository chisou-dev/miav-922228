export type TraceCity = {
  name: string;
  lat: number;
  lng: number;
};

export type TraceRegion = {
  name: string;
  lat: number;
  lng: number;
  cities: TraceCity[];
};

export type TraceCountry = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  regions: TraceRegion[];
};

/**
 * Curated Country → Region → City tree for literary Trace placement.
 * Expandable without changing map UI contracts.
 */
export const TRACE_COUNTRIES: TraceCountry[] = [
  {
    code: "JP",
    name: "Japan",
    lat: 36.2,
    lng: 138.25,
    zoom: 5,
    regions: [
      {
        name: "Tokyo",
        lat: 35.68,
        lng: 139.76,
        cities: [
          { name: "Tokyo", lat: 35.6812, lng: 139.7671 },
          { name: "Shibuya", lat: 35.6595, lng: 139.7004 },
          { name: "Shinjuku", lat: 35.6938, lng: 139.7034 },
        ],
      },
      {
        name: "Osaka",
        lat: 34.69,
        lng: 135.5,
        cities: [
          { name: "Osaka", lat: 34.6937, lng: 135.5023 },
          { name: "Namba", lat: 34.665, lng: 135.501 },
        ],
      },
      {
        name: "Kyoto",
        lat: 35.01,
        lng: 135.77,
        cities: [
          { name: "Kyoto", lat: 35.0116, lng: 135.7681 },
          { name: "Gion", lat: 35.0037, lng: 135.778 },
        ],
      },
      {
        name: "Hokkaido",
        lat: 43.06,
        lng: 141.35,
        cities: [
          { name: "Sapporo", lat: 43.0618, lng: 141.3545 },
          { name: "Hakodate", lat: 41.7687, lng: 140.729 },
        ],
      },
    ],
  },
  {
    code: "US",
    name: "United States",
    lat: 39.8,
    lng: -98.5,
    zoom: 4,
    regions: [
      {
        name: "California",
        lat: 36.8,
        lng: -119.4,
        cities: [
          { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
          { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
          { name: "San Diego", lat: 32.7157, lng: -117.1611 },
        ],
      },
      {
        name: "New York",
        lat: 43.0,
        lng: -75.0,
        cities: [
          { name: "New York City", lat: 40.7128, lng: -74.006 },
          { name: "Buffalo", lat: 42.8864, lng: -78.8784 },
        ],
      },
      {
        name: "Washington",
        lat: 47.4,
        lng: -120.5,
        cities: [
          { name: "Seattle", lat: 47.6062, lng: -122.3321 },
          { name: "Spokane", lat: 47.6588, lng: -117.426 },
        ],
      },
      {
        name: "Illinois",
        lat: 40.0,
        lng: -89.0,
        cities: [{ name: "Chicago", lat: 41.8781, lng: -87.6298 }],
      },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    lat: 54.0,
    lng: -2.0,
    zoom: 5.5,
    regions: [
      {
        name: "England",
        lat: 52.5,
        lng: -1.5,
        cities: [
          { name: "London", lat: 51.5074, lng: -0.1278 },
          { name: "Manchester", lat: 53.4808, lng: -2.2426 },
          { name: "Oxford", lat: 51.752, lng: -1.2577 },
        ],
      },
      {
        name: "Scotland",
        lat: 56.5,
        lng: -4.0,
        cities: [
          { name: "Edinburgh", lat: 55.9533, lng: -3.1883 },
          { name: "Glasgow", lat: 55.8642, lng: -4.2518 },
        ],
      },
    ],
  },
  {
    code: "FR",
    name: "France",
    lat: 46.2,
    lng: 2.2,
    zoom: 5.5,
    regions: [
      {
        name: "Île-de-France",
        lat: 48.85,
        lng: 2.35,
        cities: [
          { name: "Paris", lat: 48.8566, lng: 2.3522 },
          { name: "Versailles", lat: 48.8049, lng: 2.1204 },
        ],
      },
      {
        name: "Provence-Alpes-Côte d'Azur",
        lat: 43.9,
        lng: 6.0,
        cities: [
          { name: "Marseille", lat: 43.2965, lng: 5.3698 },
          { name: "Nice", lat: 43.7102, lng: 7.262 },
        ],
      },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    lat: 51.2,
    lng: 10.4,
    zoom: 5.5,
    regions: [
      {
        name: "Berlin",
        lat: 52.52,
        lng: 13.4,
        cities: [{ name: "Berlin", lat: 52.52, lng: 13.405 }],
      },
      {
        name: "Bavaria",
        lat: 48.8,
        lng: 11.5,
        cities: [
          { name: "Munich", lat: 48.1351, lng: 11.582 },
          { name: "Nuremberg", lat: 49.4521, lng: 11.0767 },
        ],
      },
    ],
  },
  {
    code: "KR",
    name: "South Korea",
    lat: 36.5,
    lng: 127.8,
    zoom: 6.5,
    regions: [
      {
        name: "Seoul",
        lat: 37.57,
        lng: 126.98,
        cities: [
          { name: "Seoul", lat: 37.5665, lng: 126.978 },
          { name: "Gangnam", lat: 37.4979, lng: 127.0276 },
        ],
      },
      {
        name: "Busan",
        lat: 35.18,
        lng: 129.08,
        cities: [{ name: "Busan", lat: 35.1796, lng: 129.0756 }],
      },
    ],
  },
  {
    code: "TW",
    name: "Taiwan",
    lat: 23.7,
    lng: 121.0,
    zoom: 7,
    regions: [
      {
        name: "Taipei",
        lat: 25.03,
        lng: 121.57,
        cities: [{ name: "Taipei", lat: 25.033, lng: 121.5654 }],
      },
      {
        name: "Kaohsiung",
        lat: 22.63,
        lng: 120.3,
        cities: [{ name: "Kaohsiung", lat: 22.6273, lng: 120.3014 }],
      },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    lat: -25.0,
    lng: 134.0,
    zoom: 4,
    regions: [
      {
        name: "New South Wales",
        lat: -32.0,
        lng: 147.0,
        cities: [
          { name: "Sydney", lat: -33.8688, lng: 151.2093 },
          { name: "Newcastle", lat: -32.9283, lng: 151.7817 },
        ],
      },
      {
        name: "Victoria",
        lat: -37.0,
        lng: 144.0,
        cities: [{ name: "Melbourne", lat: -37.8136, lng: 144.9631 }],
      },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    lat: 56.0,
    lng: -96.0,
    zoom: 3.5,
    regions: [
      {
        name: "Ontario",
        lat: 50.0,
        lng: -85.0,
        cities: [
          { name: "Toronto", lat: 43.6532, lng: -79.3832 },
          { name: "Ottawa", lat: 45.4215, lng: -75.6972 },
        ],
      },
      {
        name: "British Columbia",
        lat: 53.7,
        lng: -127.6,
        cities: [{ name: "Vancouver", lat: 49.2827, lng: -123.1207 }],
      },
    ],
  },
  {
    code: "BR",
    name: "Brazil",
    lat: -14.2,
    lng: -51.9,
    zoom: 4,
    regions: [
      {
        name: "São Paulo",
        lat: -23.5,
        lng: -46.6,
        cities: [{ name: "São Paulo", lat: -23.5505, lng: -46.6333 }],
      },
      {
        name: "Rio de Janeiro",
        lat: -22.9,
        lng: -43.2,
        cities: [{ name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 }],
      },
    ],
  },
  {
    code: "IN",
    name: "India",
    lat: 22.0,
    lng: 79.0,
    zoom: 4.5,
    regions: [
      {
        name: "Maharashtra",
        lat: 19.7,
        lng: 75.3,
        cities: [
          { name: "Mumbai", lat: 19.076, lng: 72.8777 },
          { name: "Pune", lat: 18.5204, lng: 73.8567 },
        ],
      },
      {
        name: "Delhi",
        lat: 28.7,
        lng: 77.1,
        cities: [{ name: "New Delhi", lat: 28.6139, lng: 77.209 }],
      },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    lat: 1.35,
    lng: 103.82,
    zoom: 11,
    regions: [
      {
        name: "Singapore",
        lat: 1.35,
        lng: 103.82,
        cities: [{ name: "Singapore", lat: 1.3521, lng: 103.8198 }],
      },
    ],
  },
];

export function findCountry(nameOrCode: string): TraceCountry | undefined {
  const q = nameOrCode.trim().toLowerCase();
  return TRACE_COUNTRIES.find(
    (c) => c.name.toLowerCase() === q || c.code.toLowerCase() === q,
  );
}

export function findRegion(
  country: TraceCountry,
  regionName: string,
): TraceRegion | undefined {
  const q = regionName.trim().toLowerCase();
  return country.regions.find((r) => r.name.toLowerCase() === q);
}

export function findCity(
  region: TraceRegion,
  cityName: string,
): TraceCity | undefined {
  const q = cityName.trim().toLowerCase();
  return region.cities.find((c) => c.name.toLowerCase() === q);
}

export function resolveLocationCoords(input: {
  country: string;
  region: string;
  city: string;
}): { lat: number; lng: number; zoom: number } | null {
  const country = findCountry(input.country);
  if (!country) return null;
  const region = findRegion(country, input.region);
  if (!region) {
    return { lat: country.lat, lng: country.lng, zoom: country.zoom };
  }
  const city = findCity(region, input.city);
  if (!city) {
    return { lat: region.lat, lng: region.lng, zoom: Math.min(country.zoom + 3, 10) };
  }
  return { lat: city.lat, lng: city.lng, zoom: 11 };
}

/** Map ISO / common names from IP lookup onto curated countries. */
export function matchCountryFromGeo(input: {
  countryCode?: string | null;
  countryName?: string | null;
}): TraceCountry | undefined {
  const code = input.countryCode?.trim().toUpperCase();
  if (code) {
    const byCode = TRACE_COUNTRIES.find((c) => c.code === code);
    if (byCode) return byCode;
  }
  const name = input.countryName?.trim();
  if (name) return findCountry(name);
  return undefined;
}

export function nearestCityInCountry(
  country: TraceCountry,
  lat: number,
  lng: number,
): { region: TraceRegion; city: TraceCity } | null {
  let best: { region: TraceRegion; city: TraceCity; dist: number } | null = null;
  for (const region of country.regions) {
    for (const city of region.cities) {
      const dist =
        (city.lat - lat) * (city.lat - lat) + (city.lng - lng) * (city.lng - lng);
      if (!best || dist < best.dist) {
        best = { region, city, dist };
      }
    }
  }
  return best ? { region: best.region, city: best.city } : null;
}
