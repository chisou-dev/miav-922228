/**
 * Enrich world.json with continent fields and merge extras.json.
 * Run: node scripts/enrich-world-locations.js
 * Then: npm run build:locations
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

const worldPath = path.join("data", "locations", "world.json");
const extrasPath = path.join("data", "locations", "extras.json");

const world = JSON.parse(fs.readFileSync(worldPath, "utf8"));
const extras = JSON.parse(fs.readFileSync(extrasPath, "utf8"));

const byCode = new Map();
for (const c of world.countries) {
  const continent = CONTINENT_BY_CODE[c.code] || c.continent || "Asia";
  byCode.set(c.code, { ...c, continent });
}

for (const extra of extras) {
  if (byCode.has(extra.code)) continue;
  byCode.set(extra.code, extra);
}

const countries = [...byCode.values()].sort((a, b) =>
  a.name.localeCompare(b.name),
);

world.countries = countries;
world.description =
  "MIAV Location Database — countries, territories, capitals, and major cities with continent grouping. Expandable; separate from Trace data.";
world.version = 2;

fs.writeFileSync(worldPath, JSON.stringify(world, null, 2) + "\n");
console.log(
  JSON.stringify({
    countries: countries.length,
    withContinent: countries.filter((c) => c.continent).length,
    ok: true,
  }),
);
