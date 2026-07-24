# features/world-memory

World Memory / Trace Map product (`/world-map`).

Internal submodules (code moves in Phase 4):

| Submodule | Role |
|-----------|------|
| `map/` | Leaflet shell and map orchestration UI |
| `trace/` | Trace domain + policy/auth dialogs |
| `viewer/` | Read-focused trace list/detail UI |
| `location/` | Runtime places + locations libs |
| `catalog/` | Ownership of location build pipeline (scripts stay at repo `scripts/`) |
| `admin/` | Admin trace/seed handlers |
| `api/` | HTTP handler modules for thin `app/api/*` wrappers |

**Never move:** `public/locations/**`, `data/locations/**`, cron URL `/api/cron/cleanup-traces`.
