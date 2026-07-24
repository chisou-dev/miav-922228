/**
 * One-shot expand Japan (47 prefectures) and United States (50 states + DC)
 * in data/locations/world.json. Merges existing cities; does not wipe extras.
 * Run: node scripts/expand-jp-us-regions.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const worldPath = path.join(__dirname, "..", "data", "locations", "world.json");
const world = JSON.parse(fs.readFileSync(worldPath, "utf8"));

/** Prefecture → [capital, lat, lng] (+ optional extra cities already in catalog kept via merge) */
const JP_PREFECTURES = [
  ["Hokkaido", "Sapporo", 43.0618, 141.3545],
  ["Aomori", "Aomori", 40.8244, 140.74],
  ["Iwate", "Morioka", 39.7036, 141.1527],
  ["Miyagi", "Sendai", 38.2682, 140.8694],
  ["Akita", "Akita", 39.7186, 140.1024],
  ["Yamagata", "Yamagata", 38.2404, 140.3633],
  ["Fukushima", "Fukushima", 37.7503, 140.4676],
  ["Ibaraki", "Mito", 36.3418, 140.4468],
  ["Tochigi", "Utsunomiya", 36.5551, 139.8828],
  ["Gunma", "Maebashi", 36.3911, 139.0608],
  ["Saitama", "Saitama", 35.8617, 139.6455],
  ["Chiba", "Chiba", 35.6074, 140.1065],
  ["Tokyo", "Tokyo", 35.6812, 139.7671],
  ["Kanagawa", "Yokohama", 35.4437, 139.638],
  ["Niigata", "Niigata", 37.9161, 139.0364],
  ["Toyama", "Toyama", 36.6953, 137.2113],
  ["Ishikawa", "Kanazawa", 36.5613, 136.6562],
  ["Fukui", "Fukui", 36.0652, 136.2216],
  ["Yamanashi", "Kofu", 35.6642, 138.5684],
  ["Nagano", "Nagano", 36.6513, 138.181],
  ["Gifu", "Gifu", 35.3912, 136.7223],
  ["Shizuoka", "Shizuoka", 34.9756, 138.3828],
  ["Aichi", "Nagoya", 35.1815, 136.9066],
  ["Mie", "Tsu", 34.7303, 136.5086],
  ["Shiga", "Otsu", 35.0045, 135.8686],
  ["Kyoto", "Kyoto", 35.0116, 135.7681],
  ["Osaka", "Osaka", 34.6937, 135.5023],
  ["Hyogo", "Kobe", 34.6901, 135.1955],
  ["Nara", "Nara", 34.6851, 135.8048],
  ["Wakayama", "Wakayama", 34.2305, 135.1708],
  ["Tottori", "Tottori", 35.5011, 134.2351],
  ["Shimane", "Matsue", 35.4723, 133.0505],
  ["Okayama", "Okayama", 34.6551, 133.9195],
  ["Hiroshima", "Hiroshima", 34.3853, 132.4553],
  ["Yamaguchi", "Yamaguchi", 34.1859, 131.4714],
  ["Tokushima", "Tokushima", 34.0658, 134.5593],
  ["Kagawa", "Takamatsu", 34.3401, 134.0434],
  ["Ehime", "Matsuyama", 33.8416, 132.7657],
  ["Kochi", "Kochi", 33.5597, 133.5311],
  ["Fukuoka", "Fukuoka", 33.5904, 130.4017],
  ["Saga", "Saga", 33.2494, 130.2988],
  ["Nagasaki", "Nagasaki", 32.7503, 129.8779],
  ["Kumamoto", "Kumamoto", 32.8031, 130.7079],
  ["Oita", "Oita", 33.2382, 131.6126],
  ["Miyazaki", "Miyazaki", 31.9077, 131.4202],
  ["Kagoshima", "Kagoshima", 31.5966, 130.5571],
  ["Okinawa", "Naha", 26.2124, 127.6809],
];

const US_STATES = [
  ["Alabama", "Montgomery", 32.3792, -86.3077],
  ["Alaska", "Juneau", 58.3019, -134.4197],
  ["Arizona", "Phoenix", 33.4484, -112.074],
  ["Arkansas", "Little Rock", 34.7465, -92.2896],
  ["California", "Sacramento", 38.5816, -121.4944],
  ["Colorado", "Denver", 39.7392, -104.9903],
  ["Connecticut", "Hartford", 41.7658, -72.6734],
  ["Delaware", "Dover", 39.1582, -75.5244],
  ["Florida", "Tallahassee", 30.4383, -84.2807],
  ["Georgia", "Atlanta", 33.749, -84.388],
  ["Hawaii", "Honolulu", 21.3069, -157.8583],
  ["Idaho", "Boise", 43.615, -116.2023],
  ["Illinois", "Springfield", 39.7817, -89.6501],
  ["Indiana", "Indianapolis", 39.7684, -86.1581],
  ["Iowa", "Des Moines", 41.5868, -93.625],
  ["Kansas", "Topeka", 39.0473, -95.6752],
  ["Kentucky", "Frankfort", 38.2009, -84.8733],
  ["Louisiana", "Baton Rouge", 30.4515, -91.1871],
  ["Maine", "Augusta", 44.3106, -69.7795],
  ["Maryland", "Annapolis", 38.9784, -76.4922],
  ["Massachusetts", "Boston", 42.3601, -71.0589],
  ["Michigan", "Lansing", 42.7325, -84.5555],
  ["Minnesota", "Saint Paul", 44.9537, -93.09],
  ["Mississippi", "Jackson", 32.2988, -90.1848],
  ["Missouri", "Jefferson City", 38.5767, -92.1735],
  ["Montana", "Helena", 46.5891, -112.0391],
  ["Nebraska", "Lincoln", 40.8136, -96.7026],
  ["Nevada", "Carson City", 39.1638, -119.7674],
  ["New Hampshire", "Concord", 43.2081, -71.5376],
  ["New Jersey", "Trenton", 40.2206, -74.7597],
  ["New Mexico", "Santa Fe", 35.687, -105.9378],
  ["New York", "Albany", 42.6526, -73.7562],
  ["North Carolina", "Raleigh", 35.7796, -78.6382],
  ["North Dakota", "Bismarck", 46.8083, -100.7837],
  ["Ohio", "Columbus", 39.9612, -82.9988],
  ["Oklahoma", "Oklahoma City", 35.4676, -97.5164],
  ["Oregon", "Salem", 44.9429, -123.0351],
  ["Pennsylvania", "Harrisburg", 40.2732, -76.8867],
  ["Rhode Island", "Providence", 41.824, -71.4128],
  ["South Carolina", "Columbia", 34.0007, -81.0348],
  ["South Dakota", "Pierre", 44.3683, -100.351],
  ["Tennessee", "Nashville", 36.1627, -86.7816],
  ["Texas", "Austin", 30.2672, -97.7431],
  ["Utah", "Salt Lake City", 40.7608, -111.891],
  ["Vermont", "Montpelier", 44.2601, -72.5754],
  ["Virginia", "Richmond", 37.5407, -77.436],
  ["Washington", "Olympia", 47.0379, -122.9007],
  ["West Virginia", "Charleston", 38.3498, -81.6326],
  ["Wisconsin", "Madison", 43.0731, -89.4012],
  ["Wyoming", "Cheyenne", 41.14, -104.8202],
  ["District of Columbia", "Washington, D.C.", 38.9072, -77.0369],
];

function mergeRegions(existingRegions, expansions) {
  const byName = new Map();
  for (const region of existingRegions || []) {
    byName.set(region.name, {
      name: region.name,
      lat: region.lat,
      lng: region.lng,
      cities: [...(region.cities || [])],
    });
  }

  for (const [regionName, capital, lat, lng] of expansions) {
    let region = byName.get(regionName);
    if (!region) {
      region = { name: regionName, lat, lng, cities: [] };
      byName.set(regionName, region);
    } else {
      region.lat = region.lat ?? lat;
      region.lng = region.lng ?? lng;
    }
    const hasCapital = region.cities.some(
      (c) => c.name.toLowerCase() === capital.toLowerCase(),
    );
    if (!hasCapital) {
      region.cities.unshift({ name: capital, lat, lng });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function patchCountry(code, expansions) {
  const country = world.countries.find((c) => c.code === code);
  if (!country) throw new Error(`Missing country ${code}`);
  country.regions = mergeRegions(country.regions, expansions);
  console.log(
    `${code}: ${country.regions.length} regions, ${country.regions.reduce((n, r) => n + r.cities.length, 0)} cities`,
  );
}

patchCountry(
  "JP",
  JP_PREFECTURES.map(([r, c, lat, lng]) => [r, c, lat, lng]),
);
patchCountry(
  "US",
  US_STATES.map(([r, c, lat, lng]) => [r, c, lat, lng]),
);

fs.writeFileSync(worldPath, `${JSON.stringify(world, null, 2)}\n`);
console.log("Updated", worldPath);
