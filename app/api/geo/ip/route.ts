import { NextResponse } from "next/server";
import {
  matchCountryFromGeo,
  nearestCityInCountry,
} from "@/lib/trace/locations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

export async function GET(request: Request) {
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  const vercelRegion = request.headers.get("x-vercel-ip-country-region");
  const vercelCity = request.headers.get("x-vercel-ip-city");

  let countryCode = vercelCountry?.trim() || "";
  let countryName = "";
  let regionName = vercelRegion?.trim() || "";
  let cityName = vercelCity ? decodeURIComponent(vercelCity) : "";
  let lat: number | null = null;
  let lng: number | null = null;

  if (!countryCode) {
    const ip = clientIp(request);
    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
          headers: { Accept: "application/json" },
          next: { revalidate: 0 },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            country_code?: string;
            country_name?: string;
            region?: string;
            city?: string;
            latitude?: number;
            longitude?: number;
          };
          countryCode = data.country_code || "";
          countryName = data.country_name || "";
          regionName = data.region || regionName;
          cityName = data.city || cityName;
          lat = typeof data.latitude === "number" ? data.latitude : null;
          lng = typeof data.longitude === "number" ? data.longitude : null;
        }
      } catch {
        // Fall through to curated defaults.
      }
    }
  }

  const country = matchCountryFromGeo({
    countryCode,
    countryName,
  });

  if (!country) {
    return NextResponse.json({
      country: "",
      region: "",
      city: "",
      lat: null,
      lng: null,
      source: "none",
    });
  }

  let region = country.regions.find(
    (r) => r.name.toLowerCase() === regionName.toLowerCase(),
  );
  let city = region?.cities.find(
    (c) => c.name.toLowerCase() === cityName.toLowerCase(),
  );

  if ((!region || !city) && lat != null && lng != null) {
    const nearest = nearestCityInCountry(country, lat, lng);
    if (nearest) {
      region = nearest.region;
      city = nearest.city;
    }
  }

  if (!region) region = country.regions[0];
  if (!city && region) city = region.cities[0];

  return NextResponse.json({
    country: country.name,
    region: region?.name || "",
    city: city?.name || "",
    lat: city?.lat ?? country.lat,
    lng: city?.lng ?? country.lng,
    source: vercelCountry ? "vercel" : "ipapi",
  });
}
