# Location Database

Static place catalog for MIAV World Map — **not stored in Firestore**.

## Source of truth

| File | Role |
|------|------|
| `data/locations/world.json` | Editable source (countries → regions → cities) |
| `data/locations/locations.json` | Flat catalog + `locationId` (built; used by server) |
| `public/locations/index.json` | Country index only (Vercel static) |
| `public/locations/countries/{CODE}.json` | Per-country regions/cities (load on demand) |

Regenerate static files after editing `world.json`:

```bash
npm run build:locations
```

## Fields

Each place has:

- `locationId` — e.g. `JP:tokyo:tokyo`
- `country` / `region` / `city`
- `latitude` / `longitude` (as `lat` / `lng` in JSON)

## Delivery

Location JSON is served as Vercel static assets under `/locations/`.
The client loads the country index first, then only the selected country’s file.
**Firestore is never used for Location data.**

## Trace separation

Firestore holds **Trace only** (`trace_map` / `trace_locations`):

- `locationId` (canonical; new writes)
- denormalized `country` / `region` / `city` (legacy + migration bridge)
- `miavId`, `uid`, `authType`, `message`, timestamps

Existing Traces without `locationId` still resolve via country/region/city.
New and updated Traces always write `locationId`.

## Scope

Initial catalog: countries + capitals / major / famous cities — not every city worldwide.
Expand by editing `world.json` and rebuilding; no Firestore migration required for places.
