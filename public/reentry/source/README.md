# Stage 1 space–Earth background source

## `stage1-space-earth.webp`

| Field | Value |
|--------|--------|
| **Source** | NASA Image and Video Library — Apollo 17 “Blue Marble” (AS17-148-22727) |
| **Agency** | NASA (public domain; see [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)) |
| **Original URL** | https://images-assets.nasa.gov/image/as17-148-22727/as17-148-22727~orig.jpg |
| **Local original** | `stage1-space-earth-original.jpg` (downloaded from the URL above) |
| **Prepared** | 2026-10-05 |
| **Processing** | Crop (lower-right arc, ~88%×62% region), resize to 2400×1800, brightness/saturation tweak, WebP q≈84 |

Regenerate the WebP after replacing the original:

```bash
node scripts/prepare-reentry-earth.mjs
```

Output: `../stage1-space-earth.webp` (served path `/reentry/stage1-space-earth.webp`).

## `stage1-vehicle.webp`

| Field | Value |
|--------|--------|
| **Source** | `stage1-vehicle-source.jpg` (or `.png` / legacy `.svg`) — fictional reentry craft, not a NASA vehicle copy |
| **Prepared** | 2026-10-06 (final art pass) |
| **Processing** | Resize to ~768×1280, dark-background key-out → WebP q≈90 with alpha |

Drop a new painted source file in this folder, then:

```bash
node scripts/prepare-reentry-vehicle.mjs
```

Output: `../stage1-vehicle.webp` (`/reentry/stage1-vehicle.webp`). **Image up = nose.** Tune `craftNoseRotationOffsetDeg` in `reentrySceneLayout.ts` if the asset changes.

## `stage1-space-earth.webp` (2026-10-06)

Earth is **composited** on stage-black `#020304` (~18% frame width at lower-left) with a soft limb mask so the texture has no visible rectangular panel edge in the stage.
