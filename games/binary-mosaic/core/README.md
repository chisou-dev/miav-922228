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
  solver.ts    — exact-cover solvability / uniqueness (dev · Creator; not play UI)
  generator.ts — CreatorIntent → LevelData candidates (no Solver call)
  evaluator.ts — LevelData + SolverResult → quality score via EvaluationProfile (no Gen/Solver call)
  index.ts     — public exports
```

## Dependency direction (do not reverse)

```
block / levelData / board → rules → level / session (play)
                          ↘
                           solver     ← sibling (validates LevelData)
                          ↗
block / board / rules / level / levelData → generator  ← sibling (emits LevelData)
level / levelData + SolverResult type     → evaluator  ← sibling (quality gate)
```

`block.ts` / `levelData.ts` own catalogs only (add rows in data — no per-id switches).
Placement lives in `rules` / `session`. Pack extraction lives in `level.ts`.
`generator.ts` packs LevelData only — does **not** import `solver` or `evaluator`.
`solver.ts` validates LevelData only — does **not** import `generator` or `evaluator`.
`evaluator.ts` scores LevelData + precomputed `SolverResult` — does **not** call Generator or `solveLevel`.
Do not import from ui/ or wire Solver/Evaluator into MosaicPlayfield.

Orchestrator (outside core) may sequence:

```
generateLevel → solveLevel → evaluateLevel
```

Add later under `core/`:

- `analyzer.ts`

## Consumers

- `puzzle/*` — thin adapters for level JSON + scoring / binary text
- `ui/*` — React only; prefer `@/games/binary-mosaic/core` for place/rotate
- `scripts/*` — verify / evaluate / smoke (orchestrators)
