# Binary Mosaic

Glass binary packing puzzle. Fragments of `0` / `1` assemble into an ASCII bit field.

## Levels 1–3 (now)

| Level | Target | Grid | Layout |
|------:|--------|------|--------|
| 1 | `HI` | 2×8 | 1 row = 1 character |
| 2 | `HEL` | 3×8 | 1 row = 1 character |
| 3 | `HELLO` | 5×8 | 1 row = 1 character |

Bits are real 8-bit ASCII. Clear only when the assembled field decodes to `targetText`.

When a full row is filled:
- correct bits → letter appears on the left (`H`, `E`, …)
- wrong bits → `?`
- incomplete → blank / `·`
