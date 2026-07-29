import { LUNA_SPRITESHEET_URL } from "@/engine/luna/atlas";

let preloadPromise: Promise<void> | null = null;
let cachedReady = false;

/** Load the shared Luna spritesheet once per session. */
export function preloadLunaSpritesheet(): Promise<void> {
  if (cachedReady) return Promise.resolve();
  if (typeof window === "undefined") return Promise.resolve();
  if (preloadPromise) return preloadPromise;

  preloadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      cachedReady = true;
      resolve();
    };
    img.onerror = () => {
      preloadPromise = null;
      reject(new Error(`Failed to load Luna spritesheet: ${LUNA_SPRITESHEET_URL}`));
    };
    img.src = LUNA_SPRITESHEET_URL;
  });

  return preloadPromise;
}

export function isLunaSpritesheetReady(): boolean {
  return cachedReady;
}
