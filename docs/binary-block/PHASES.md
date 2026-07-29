# Binary Block — Phased Development

**Product name:** Binary Block  
**Implementation slug:** `binary-mosaic`  
**North star:** Do not increase bundle size. One phase at a time.

---

## Current phase: **2**

```ts
export const BINARY_BLOCK_PHASE = 2 as const;
```

Phase 1 checklist complete. Phase 2 adds **device-only** `localStorage` progress.
Runtime Luna assets are removed until Phase 3 is explicitly re-enabled.

---

## Phase 2 — Local save (current)

| Feature | Storage key | Notes |
|---------|-------------|--------|
| Cleared levels | `binary_block_progress.clearedLevels` | Sorted unique level ids |
| Best Pattern Score | `bestScores["levelId"]` | Higher wins (0–100) |
| Best time | `bestTimes["levelId"]` | Lower wins (seconds) |

### Phase 2 — forbidden

Firebase · Google login · ranking UI · network / `fetch` · user IDs · World Memory

---

## Phase 1 — Completion checklist (quality gate)

Before **any** new feature, re-read this list. Fix regressions first.

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Levels 1–10 are all clearable | ✅ Verified by playtest |
| 2 | Difficulty rises naturally | ✅ Monotonic piece curve (3→9); rotation from L20 |
| 3 | Zero known bugs | ✅ Production build clean; input/drag fixes applied |
| 4 | Stable FPS during play & clear FX | ✅ Drag uses rAF + direct DOM transform |
| 5 | Light first load (minimal initial JS) | ✅ ClearSequence dynamically imported |
| 6 | Comfortable on mobile (touch, layout) | ✅ Responsive cellPx + 44px targets + stacked layout |
| 7 | SE volume balance tuned | ✅ BGM layers scaled from shared `SE_GAIN` |
| 8 | BGM loop feels natural | ✅ 16-step melody + bass; BPM scales with stage |
| 9 | Keyboard · mouse · touch verified | ✅ Tab/arrows/Enter/R + pointer drag |
| 10 | No duplicated logic | ✅ Shared `boardGrid` helpers |
| 11 | No dead files or unused imports | ✅ Phase 2+ stubs removed; build passes |

### Phase 1 scope

Levels · puzzle · UI · clear sequence · procedural SE/BGM · performance · input · polish

### Phase 1 — forbidden

| Forbidden | Phase |
|-----------|--------|
| Ranking UI (even dummy) | 4 |
| Firebase / Google login | 5 |
| Luna / spritesheet | 3 |
| Network / `fetch` | 5 |
| Stub folders for future phases | — |

Session-only React state is OK (sound toggle, current level while playing). **`localStorage` progress is Phase 2.**

---

## Phase 2 — Local save ✅ Complete

Cleared · best time · best Pattern Score (device only). **Implemented** via `games/binary-mosaic/progress/storage.ts`.

Verified: empty start · save on clear · reload restore · independent best score/time · corrupt payload recovery.

## Phase 3 — Luna

Mascot in-game (deferred). No runtime spritesheet / UI until re-enabled.

## Phase 4 — Ranking UI (dummy)

Layout + mock data. No API.

## Phase 5 — World ranking

Google login + Firebase.

---

## Levels

Add via `games/binary-mosaic/levels/levels.json` only.

---

## Agent workflow

1. Read checklist — anything failing? Fix before adding features.
2. Change only the **current phase** scope (see `BINARY_BLOCK_PHASE`).
3. Run `npm run build` after substantive edits.
4. Phase 3+ only after Phase 2 scope is complete.
