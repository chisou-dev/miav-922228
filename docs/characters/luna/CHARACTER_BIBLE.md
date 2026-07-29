# MIAV ルナ — Character Bible (公式設定資料) v1.1

> **Authoritative reference:** `docs/characters/luna/reference.png`  
> Treat the reference image as the single source of truth. When text and image disagree, follow the image.

## Directive

添付画像を Character Bible（公式設定資料）として扱い、この画像からデザインドリフト（特徴の変化）が発生しないよう、常に同一キャラクターとして生成・実装すること。

## Identity

| Field | Value |
|-------|-------|
| Name (EN) | Luna |
| Name (JP) | ルナ |
| Role | MIAV official character — partner who watches over and connects memories (Trace) |
| Species | AI dog (appears as an ordinary small dog / puppy) |
| Mood keywords | Kindness · Trust · Hope |

## Core concept

- Real-dog warmth + futuristic blue accents (subtle, not cyber-mech).
- AI dog, but looks like a normal dog until the story reveals otherwise.
- Prioritize **companionship** over cuteness.

## Official color palette (immutable)

| Role | Hex | Usage |
|------|-----|-------|
| Base fur | `#FFF5EC` | Body, face |
| Shadow fur | `#F1E7D6` | Soft shading |
| Light blue | `#CFE6FF` | Head mesh / fringe streaks |
| Medium blue | `#58A7E6` | Nose, paw pads (nikukyu) |
| Dark blue | `#2E7BCB` | Eyes, left-front-leg ring |
| Outline / mouth | Dark navy / black | Linework |

## Silhouette

- Small puppy proportions (Retriever/Lab feel + Shiba curled tail)
- Slightly round body, head slightly large
- Short legs
- Thick cream tail curled tightly over the back

## Face

- Round nose — **medium blue `#58A7E6`**
- Gentle smile, large expressive eyes **`#2E7BCB`** with white highlights
- Slight visible sclera

## Ears (immutable)

- **Natural floppy ears — never upright**
- Hang to cheek level, rounded tips, not too thick

## Head marking (immutable)

- **Small blue + white mesh tuft on the forehead/fringe only** (`#CFE6FF`)
- Symbol: information / flow of thoughts
- Keep subtle — not a full streak or large patch

## Left front leg ring (immutable)

- **Thin dark-blue ring `#2E7BCB` on left front leg only**
- Symbol: connections / ring of memories
- Not a collar, not an accessory — Luna's unique mark
- No ring on any other leg

## Paws (immutable)

- Paw pads are **medium blue `#58A7E6`** (match nose)

## Tail

- Curled, Shiba-style, thick cream fur

## Expression baseline

- Kind, slightly intelligent, calm
- Safe and reassuring for children

## Absolute NG list

Do **not** introduce these in any asset, sprite, UI, or generated art:

- Robot dog appearance
- LED eyes
- Metal joints
- Mecha ears
- Collar / leash
- Armor
- Heavy cyber / sci-fi styling
- Upright ears
- Blue ring on legs other than left front
- Large or excessive blue mesh on head
- Right-front-leg blue line or ring (deprecated — use left front only)
- Changing official hex colors above

## Worldview

Viewers should think "a normal dog." After reading the work: "Oh — she was AI."

## Official sheet contents (reference.png)

The reference file is the full Character Bible sheet and includes:

- Front / 3⁄4 / side / back turnaround
- Icon variants (smile, wink, curious, profile)
- Silhouettes (blue nose + leg ring remain identifiable)
- Favicon / UI sizes (16px → 180px)

When creating derivatives, match these layouts and keep all immutable features.

## Runtime spritesheet (site-wide)

Runtime Luna assets are currently **removed** from the game (no `public/characters/luna/` spritesheet, no `engine/luna` module). Rebuild later with `scripts/build-luna-spritesheet.py` when Phase 3 is re-enabled.

## Image generation prompt (stable baseline)

```
MIAV mascot Luna, small cream puppy (#FFF5EC), gentle smile,
medium-blue round nose (#58A7E6), blue paw pads (#58A7E6),
natural floppy ears (not upright), small subtle blue mesh on forehead fringe (#CFE6FF),
thin dark-blue ring on left front leg only (#2E7BCB, not a collar),
shiba-like curled cream tail, warm companionship mood,
soft clean illustration, no robot parts, no collar, no cyber aesthetic
```

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-28 | Initial bible from design session |
| 1.1 | 2026-07-28 | Locked official sheet + hex palette into `reference.png` |
