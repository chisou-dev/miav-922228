/**
 * One-off: crop NASA source → Stage 1 WebP.
 * Run: node scripts/prepare-reentry-earth.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(
  root,
  "public/reentry/source/stage1-space-earth-original.jpg",
);
const outWebp = path.join(root, "public/reentry/stage1-space-earth.webp");

const meta = await sharp(source).metadata();
const w = meta.width ?? 3000;
const h = meta.height ?? 3000;

// Centered disk: lower-right arc — dark space upper-left, photographed limb lower frame.
const cropW = Math.round(w * 0.88);
const cropH = Math.round(h * 0.62);
const left = Math.round(w * 0.08);
const top = Math.round(h * 0.2);

await mkdir(path.dirname(outWebp), { recursive: true });

await sharp(source)
  .extract({ left, top, width: cropW, height: cropH })
  .resize(2400, 1800, { fit: "cover", position: "bottom" })
  .modulate({ brightness: 0.94, saturation: 1.02 })
  .webp({ quality: 84, effort: 6 })
  .toFile(outWebp);

const outMeta = await sharp(outWebp).metadata();
console.log("Wrote", outWebp, `${outMeta.width}x${outMeta.height}`);
