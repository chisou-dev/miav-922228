/**
 * Build static Location files for Vercel (/public/locations)
 * and a server-side flat catalog (data/locations/locations.json).
 */
const fs = require("fs");
const path = require("path");

const world = JSON.parse(
  fs.readFileSync(path.join("data", "locations", "world.json"), "utf8"),
);

function slug(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const CONTINENTS = [
  "Asia",
  "Europe",
  "Africa",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
];

const publicDir = path.join("public", "locations");
fs.mkdirSync(path.join(publicDir, "countries"), { recursive: true });

const index = {
  version: 2,
  description:
    "Location index — countries/territories by continent. Load /locations/countries/{code}.json on demand.",
  continents: CONTINENTS,
  countries: [],
};

const flatLocations = [];
const countryMeta = [];
let totalCities = 0;

for (const c of world.countries) {
  const continent = c.continent || "Asia";
  countryMeta.push({
    code: c.code,
    name: c.name,
    continent,
    lat: c.lat,
    lng: c.lng,
    zoom: c.zoom,
  });

  const regions = c.regions.map((r) => ({
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    cities: r.cities.map((city) => {
      totalCities += 1;
      const locationId = `${c.code}:${slug(r.name)}:${slug(city.name)}`;
      flatLocations.push({
        locationId,
        continent,
        countryCode: c.code,
        country: c.name,
        region: r.name,
        city: city.name,
        lat: city.lat,
        lng: city.lng,
      });
      return {
        locationId,
        name: city.name,
        lat: city.lat,
        lng: city.lng,
      };
    }),
  }));

  const countryFile = {
    code: c.code,
    name: c.name,
    continent,
    lat: c.lat,
    lng: c.lng,
    zoom: c.zoom,
    regions,
  };

  fs.writeFileSync(
    path.join(publicDir, "countries", `${c.code}.json`),
    JSON.stringify(countryFile),
  );

  index.countries.push({
    code: c.code,
    name: c.name,
    continent,
    lat: c.lat,
    lng: c.lng,
    zoom: c.zoom,
    path: `/locations/countries/${c.code}.json`,
  });
}

index.countries.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(
  path.join(publicDir, "index.json"),
  JSON.stringify(index, null, 2),
);

fs.writeFileSync(
  path.join("data", "locations", "locations.json"),
  JSON.stringify(
    { version: 2, countries: countryMeta, locations: flatLocations },
    null,
    2,
  ),
);

const byContinent = {};
for (const c of index.countries) {
  byContinent[c.continent] = (byContinent[c.continent] || 0) + 1;
}

console.log(
  JSON.stringify({
    countries: index.countries.length,
    cities: totalCities,
    byContinent,
    ok: true,
  }),
);
