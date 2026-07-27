# Features

Domain modules for the single Next.js app at the repo root.

**Rules**

- Deploy remains one Next.js application (`app/` owns URLs).
- Do not change routes, UI, APIs, SEO, Firestore, or Firebase config while migrating.
- Application code moves here in later phases; Phase 0 only adds ownership docs.

| Folder | Role |
|--------|------|
| `core/` | Homepage composition, external games link |
| `shared/` | Site chrome and cross-cutting helpers |
| `firebase/` | Firebase client/admin infra |
| `auth/` | Shared ID-token verification |
| `contact/` | Contact form and related server helpers |
| `dashboard/` | Admin UI and site-control |
| `novels/` | `/books` archive UI + story registry |
| `stories/` | One module per literary work |
| `world-memory/` | Trace Map product (`/world-map`) |

Games live in the separate **miav-games** repository — miav-site only links out via `features/core/gamesUrl.ts`.
