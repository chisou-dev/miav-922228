# Binary Block (slug: `binary-mosaic`)

Glass binary packing puzzle. Fragments of `0` / `1` assemble into an ASCII bit field.

**Current phase:** 1 — see checklist in [`docs/binary-block/PHASES.md`](../../docs/binary-block/PHASES.md).

## Levels 1–10

| Level | Target |
|------:|--------|
| 1 | `HI` |
| 2 | `HEL` |
| 3 | `HELLO` |
| 4 | `ROBOT` |
| 5 | `BINARY` |
| 6 | `MEMORY` |
| 7 | `HUMAN` |
| 8 | `LUNA` |
| 9 | `MIAV` |
| 10 | `DECODED` |

Bits are real 8-bit ASCII. Clear only when the assembled field decodes to `targetText`.

When a full row is filled:
- correct bits → letter appears on the left (`H`, `E`, …)
- wrong bits → `?`
- incomplete → blank / `·`
