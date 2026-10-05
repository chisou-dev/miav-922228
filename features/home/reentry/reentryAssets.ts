/**
 * Formal Stage 1 art paths (production-ready filenames).
 * Priority: WebP → SVG dev fallback (`ReentryAssetImage`).
 *
 * spaceEarth: NASA AS17-148-22727 (Apollo 17 Blue Marble) — see `public/reentry/source/README.md`.
 */

export const REENTRY_ASSET_PATHS = {
  spaceEarth: "/reentry/stage1-space-earth.webp",
  vehicle: "/reentry/stage1-vehicle.webp",
  cockpit: "/reentry/stage1-cockpit.webp",
} as const;

export const REENTRY_ASSET_FALLBACK = {
  spaceEarth: "/reentry/stage1-space-earth.svg",
  vehicle: "/reentry/stage1-vehicle.svg",
  cockpit: "/reentry/stage1-cockpit.svg",
} as const;

export type ReentryAssetKey = keyof typeof REENTRY_ASSET_PATHS;

const loaded = new Set<string>();

function preloadOne(url: string): Promise<void> {
  if (loaded.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loaded.add(url);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

function preloadAsset(key: ReentryAssetKey): Promise<void> {
  return Promise.all([
    preloadOne(REENTRY_ASSET_PATHS[key]),
    preloadOne(REENTRY_ASSET_FALLBACK[key]),
  ]).then(() => undefined);
}

/** Mobile teaser — vehicle only. */
export function preloadReentryVehicleAsset(): Promise<void> {
  return preloadAsset("vehicle");
}

/** Desktop preview + expanded ready (no cockpit). */
export function preloadReentryPreviewAssets(): Promise<void> {
  return Promise.all([
    preloadAsset("spaceEarth"),
    preloadAsset("vehicle"),
  ]).then(() => undefined);
}

/** Cockpit foreground — call on expand or just before flight. */
export function preloadReentryCockpitAsset(): Promise<void> {
  return preloadAsset("cockpit");
}
