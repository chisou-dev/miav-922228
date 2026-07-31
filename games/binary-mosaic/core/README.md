# Binary Block — `core/`

UI-free game logic. **No React, DOM, audio, localStorage, or network.**

## Layout

```
core/
  types.ts     — shared pure types
  block.ts     — piece kinds · shapes · rotations · size (data catalog)
  pieces.ts    — aliases → block.ts (compat)
  levelData.ts — level id · board · pieces map · clear target (data catalog)
  board.ts     — board size, occupancy, piece transforms
  rules.ts     — place / rotate / fill checks
  level.ts     — packed solution → pieces (algorithm)
  session.ts   — tryPlace / tryRotate / createSessionBoard
  index.ts     — public exports
```

## Dependency direction (do not reverse)

```
block / levelData / board → rules → level / session → (future) solver → analyzer → generator
```

`block.ts` / `levelData.ts` own catalogs only (add rows in data — no per-id switches).
Placement lives in `rules` / `session`. Packing lives in `level.ts`.

Add later as siblings under `core/` (not yet):

- `solver.ts`
- `analyzer.ts`
- `generator.ts`

## Consumers

- `puzzle/*` — thin adapters for level JSON + scoring / binary text
- `ui/*` — React only; prefer `@/games/binary-mosaic/core` for place/rotate
