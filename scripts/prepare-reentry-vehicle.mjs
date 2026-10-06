/**
 * Final vehicle art → Stage 1 WebP (alpha, nose up).
 * Sources (first match wins):
 *   - public/reentry/source/stage1-vehicle-source.png
 *   - public/reentry/source/stage1-vehicle-source.jpg
 *   - public/reentry/source/stage1-vehicle-source.svg
 *
 * Run: node scripts/prepare-reentry-vehicle.mjs
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "public/reentry/source");
const candidates = [
  "stage1-vehicle-source.png",
  "stage1-vehicle-source.jpg",
  "stage1-vehicle-source.svg",
];
const sourceName = candidates.find((name) =>
  existsSync(path.join(sourceDir, name)),
);
if (!sourceName) {
  throw new Error(
    `No vehicle source in ${sourceDir} (${candidates.join(", ")})`,
  );
}
const source = path.join(sourceDir, sourceName);
const outWebp = path.join(root, "public/reentry/stage1-vehicle.webp");

const TARGET_W = 768;
const TARGET_H = 1280;

/** Dark backdrop → transparent (presentation cutout). */
async function keyOutDarkBackground(input) {
  const { data, info } = await sharp(input)
    .resize(TARGET_W, TARGET_H, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
    if (lum < 28 || (lum < 52 && sat < 0.12)) {
      data[i + 3] = 0;
    } else if (lum < 72 && sat < 0.08) {
      data[i + 3] = Math.min(data[i + 3], Math.round((lum - 28) * 6));
    }
  }

  return sharp(data, { raw: { width, height, channels } })
    .trim({ threshold: 12 })
    .extend({
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(TARGET_W, TARGET_H, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90, effort: 6, alphaQuality: 100 })
    .toFile(outWebp);
}

if (sourceName.endsWith(".svg")) {
  await sharp(source, { density: 240 })
    .resize(TARGET_W, TARGET_H, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92, effort: 6, alphaQuality: 100 })
    .toFile(outWebp);
} else {
  await keyOutDarkBackground(source);
}

const meta = await sharp(outWebp).metadata();
console.log("Source:", sourceName);
console.log("Wrote", outWebp, `${meta.width}x${meta.height}`);
