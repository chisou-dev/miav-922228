# Location Database

Static place catalog for MIAV World Memory — **not stored in Firestore**.

## Source of truth

| File | Role |
|------|------|
| `data/locations/world.json` | Editable source (countries/territories → regions → cities + `continent`) |
| `data/locations/extras.json` | Additional islands & territories merged on build |
| `data/locations/locations.json` | Flat catalog + `locationId` (built; used by server) |
| `public/locations/index.json` | Country/territory index with continent (Vercel static) |
| `public/locations/countries/{CODE}.json` | Per-country regions/cities (load on demand) |

Regenerate after editing:

```bash
npm run build:locations
```

## Fields

Each place has:

- `locationId` — e.g. `GL:greenland:nuuk` (format `CODE:region:city`)
- `continent` — Asia / Europe / Africa / North America / South America / Oceania / Antarctica
- `country` / `region` / `city`
- `lat` / `lng`

## Selection UI

1. Continent  
2. Country / Territory (searchable within continent)  
3. Region / City  

World Memory is not an access ranking — it records that someone was present, including small islands and special territories.

## Trace separation

Firestore holds Trace only (`trace_map`). Location data never enters Firestore.
