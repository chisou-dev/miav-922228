/**
 * NASA source → distant limb on stage-black canvas (no visible image rect).
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

const STAGE_W = 2400;
const STAGE_H = 1800;
/** Match ReentryHybridStage background `#020304`. */
const BG = { r: 2, g: 3, b: 4 };

const meta = await sharp(source).metadata();
const w = meta.width ?? 3000;
const h = meta.height ?? 3000;

// Ocean-heavy limb slice (avoid large continent map read).
const cropW = Math.round(w * 0.42);
const cropH = Math.round(h * 0.42);
const left = Math.round(w * 0.04);
const top = Math.round(h * 0.48);

const earthDisk = await sharp(source)
  .extract({ left, top, width: cropW, height: cropH })
  .resize(520, 520, { fit: "cover", position: "centre" })
  .ensureAlpha()
  .png()
  .toBuffer();

const mask = Buffer.from(
  `<svg width="520" height="520" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="m" cx="50%" cy="58%" r="50%">
        <stop offset="62%" stop-color="white"/>
        <stop offset="100%" stop-color="black"/>
      </radialGradient>
    </defs>
    <rect width="520" height="520" fill="url(#m)"/>
  </svg>`,
);

const earthMasked = await sharp(earthDisk)
  .composite([{ input: await sharp(mask).png().toBuffer(), blend: "dest-in" }])
  .png()
  .toBuffer();

// ~18% of stage width — distant planet at lower-left.
const earthLeft = Math.round(STAGE_W * 0.06);
const earthTop = Math.round(STAGE_H * 0.72);

await mkdir(path.dirname(outWebp), { recursive: true });

await sharp({
  create: {
    width: STAGE_W,
    height: STAGE_H,
    channels: 3,
    background: BG,
  },
})
  .composite([{ input: earthMasked, left: earthLeft, top: earthTop }])
  .modulate({ brightness: 0.9, saturation: 0.92 })
  .webp({ quality: 86, effort: 6 })
  .toFile(outWebp);

const outMeta = await sharp(outWebp).metadata();
console.log("Wrote", outWebp, `${outMeta.width}x${outMeta.height}`);
