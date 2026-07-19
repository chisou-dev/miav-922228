/**
 * Enrich world.json with continent fields and merge extras.
 * Existing country codes in world.json are never replaced (preserves regions/cities).
 * Run via: npm run build:locations
 */
const fs = require("fs");
const path = require("path");

const CONTINENT_BY_CODE = {
  JP: "Asia",
  KR: "Asia",
  CN: "Asia",
  TW: "Asia",
  HK: "Asia",
  SG: "Asia",
  TH: "Asia",
  VN: "Asia",
  PH: "Asia",
  MY: "Asia",
  ID: "Asia",
  IN: "Asia",
  AU: "Oceania",
  NZ: "Oceania",
  US: "North America",
  CA: "North America",
  MX: "North America",
  BR: "South America",
  AR: "South America",
  CL: "South America",
  CO: "South America",
  PE: "South America",
  GB: "Europe",
  IE: "Europe",
  FR: "Europe",
  DE: "Europe",
  IT: "Europe",
  ES: "Europe",
  PT: "Europe",
  NL: "Europe",
  BE: "Europe",
  CH: "Europe",
  AT: "Europe",
  SE: "Europe",
  NO: "Europe",
  DK: "Europe",
  FI: "Europe",
  PL: "Europe",
  CZ: "Europe",
  GR: "Europe",
  TR: "Asia",
  RU: "Europe",
  UA: "Europe",
  EG: "Africa",
  MA: "Africa",
  ZA: "Africa",
  NG: "Africa",
  KE: "Africa",
  AE: "Asia",
  SA: "Asia",
  IL: "Asia",
};

function fromCompact(row) {
  const [code, name, continent, capital, lat, lng] = row;
  return {
    code,
    name,
    continent,
    lat,
    lng,
    zoom: 6.5,
    regions: [
      {
        name: capital,
        lat,
        lng,
        cities: [{ name: capital, lat, lng }],
      },
    ],
  };
}

const worldPath = path.join("data", "locations", "world.json");
const extrasPath = path.join("data", "locations", "extras.json");
const compactPath = path.join("data", "locations", "extras-compact.js");

const world = JSON.parse(fs.readFileSync(worldPath, "utf8"));
const extrasJson = JSON.parse(fs.readFileSync(extrasPath, "utf8"));
const compactRows = require(path.resolve(compactPath));

const byCode = new Map();

// Preserve existing entries first (keeps existing region/city names → same locationIds).
for (const c of world.countries) {
  const continent = c.continent || CONTINENT_BY_CODE[c.code] || "Asia";
  byCode.set(c.code, { ...c, continent });
}

function mergeExtra(extra) {
  if (byCode.has(extra.code)) return;
  byCode.set(extra.code, extra);
}

for (const extra of extrasJson) mergeExtra(extra);
for (const row of compactRows) mergeExtra(fromCompact(row));

const countries = [...byCode.values()].sort((a, b) =>
  a.name.localeCompare(b.name),
);

world.countries = countries;
world.description =
  "MIAV Location Database — countries, territories, capitals, and major cities with continent grouping. Expandable; separate from Trace data.";
world.version = 3;

fs.writeFileSync(worldPath, JSON.stringify(world, null, 2) + "\n");
console.log(
  JSON.stringify({
    countries: countries.length,
    withContinent: countries.filter((c) => c.continent).length,
    ok: true,
  }),
);
