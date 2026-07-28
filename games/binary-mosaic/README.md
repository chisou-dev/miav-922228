# Binary Mosaic

Glass binary packing puzzle. Fragments of `0` / `1` assemble into an ASCII bit field.

## Levels 1–3 (now)

| Level | Target | Grid | Pieces |
|------:|--------|------|--------|
| 1 | `HI` | 4×4 | 3 |
| 2 | `HEL` | 3×8 | 4 |
| 3 | `HELLO` | 5×8 | 5 |

Bits are real 8-bit ASCII. Clear only when the assembled field decodes to `targetText`.

## Level data

Edit `levels/levels.json`:

- `bits` — 0/1 matrix (must match ASCII of `targetText`)
- `solution` — piece packing indices (`-1` = outside silhouette)
- `frame` — `"rect"` now; `"silhouette"` from ~Level 10
- `hintAllowed` — true only for early levels

## Future silhouettes (~Level 10+)

See `levels/silhouettes.ts` (`dog` placeholder). A silhouette level uses a mask so the frame is a picture outline; after a correct decode, a binary image reveal can show.
