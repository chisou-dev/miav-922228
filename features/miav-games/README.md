# features/miav-games

Interactive experiences for MIAV-922228 — separate from literary works (`features/stories/`) and the Works library.

**Rules**

- Game code lives here, not in `features/core/` or `features/stories/`.
- Routes stay under `app/` (e.g. `/game`); this module owns UI and game logic only.
- Extend with one subfolder per game (`preview/`, future `binary-run/`, etc.).

| Area | Role |
|------|------|
| `preview/` | Home hero `BinaryGamePreview` — live binary field → GAME |
| `GameIndexPage.tsx` | `/game` landing (placeholder until full games ship) |

Future: **MIAV Binary Run** and other titles add subfolders here without new top-level `features/` roots.
