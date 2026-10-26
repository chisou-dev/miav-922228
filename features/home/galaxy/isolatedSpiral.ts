/**
 * Extract only the luminous spiral from the approved embedded galaxy JPEG.
 *
 * The original image has an opaque rectangular navy sky. Transforming that
 * JPEG with yaw / pitch / roll projects the RECTANGLE as a rotating card.
 * A spherical clip only hides pixels beyond the glass rim; it cannot remove
 * the image's four edges *inside* the sphere.
 *
 * Cache one alpha-cutout per embedded image. Keep the spiral, nucleus and
 * scattered stars, attenuate near-black photographic background, and feather
 * the halo smoothly to zero well before the original square boundary.
 *
 * Use this for the bundled (same-origin data:) artwork only. Externally
 * hosted NASA images may taint Canvas and need separate CORS handling.
 */
const cutouts = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

const smoothstep = (low: number, high: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

export function isolatedSpiral(image: HTMLImageElement): HTMLCanvasElement | null {
  if (!image.complete || image.naturalWidth < 2 || image.naturalHeight < 2) return null;
  const cached = cutouts.get(image);
  if (cached) return cached;

  const sourceSide = Math.min(image.naturalWidth, image.naturalHeight);
  const size = Math.min(sourceSide, 1100);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(
    image,
    (image.naturalWidth - sourceSide) / 2,
    (image.naturalHeight - sourceSide) / 2,
    sourceSide, sourceSide,
    0, 0, size, size,
  );
  try {
    const pixels = ctx.getImageData(0, 0, size, size);
    const data = pixels.data;
    for (let y = 0; y < size; y++) {
      const ny = (y + 0.5) * 2 / size - 1;
      for (let x = 0; x < size; x++) {
        const nx = (x + 0.5) * 2 / size - 1;
        const i = (y * size + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const maximum = Math.max(r, g, b);
        const luminance = .213 * r + .715 * g + .072 * b;
        // Preserve luminous pink/blue arms, but turn empty navy photo
        // background transparent even at the centre of the rotating disk.
        const light = smoothstep(31, 108, Math.max(maximum, luminance * 1.18));
        const halo = 1 - smoothstep(.63, .99, Math.hypot(nx, ny));
        data[i + 3] = Math.round(data[i + 3] * light * halo);
      }
    }
    ctx.putImageData(pixels, 0, 0);
  } catch {
    // A defensive fallback if an image with different provenance is ever
    // supplied: at least remove every hard square corner.
    ctx.globalCompositeOperation = "destination-in";
    const m = size / 2;
    const feather = ctx.createRadialGradient(m, m, size * .29, m, m, size * .495);
    feather.addColorStop(0, "#fff");
    feather.addColorStop(.45, "rgba(255,255,255,.91)");
    feather.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = feather;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = "source-over";
  }
  cutouts.set(image, canvas);
  return canvas;
}
