# Location Database

Static catalog of countries, major regions, and major cities for MIAV World Map.

- **Source of truth:** `world.json` (not Firestore)
- **Separate from Traces:** Trace documents live in `trace_map` / aggregates in `trace_locations`
- **Expandable:** Add countries, regions, and cities here; the map and Leave Trace form pick them up automatically

Pins on the map appear only where Traces exist. Every Location entry remains selectable for leaving a Trace.
