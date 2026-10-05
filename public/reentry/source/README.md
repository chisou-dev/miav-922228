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
