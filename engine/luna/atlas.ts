/** Shared Luna sprite sheet — single WebP, uniform grid cells. */

export const LUNA_SPRITESHEET_URL = "/characters/luna/spritesheet.webp";

export const LUNA_CELL_PX = 160;
export const LUNA_FRAME_COUNT = 12;
export const LUNA_SHEET_WIDTH = LUNA_CELL_PX * LUNA_FRAME_COUNT;
export const LUNA_SHEET_HEIGHT = LUNA_CELL_PX;

export type LunaAnimationId = "sit" | "walk" | "tail_wag" | "bark" | "sleep";

export type LunaClip = {
  /** Column indices in the spritesheet (0-based). */
  frames: number[];
  fps: number;
  loop: boolean;
};

/** Frame column indices — must match `scripts/build-luna-spritesheet.py` FRAME_ORDER. */
const FRAME: Record<string, number> = {
  sit_0: 0,
  sit_1: 1,
  walk_0: 2,
  walk_1: 3,
  walk_2: 4,
  walk_3: 5,
  tail_0: 6,
  tail_1: 7,
  tail_2: 8,
  bark_0: 9,
  bark_1: 10,
  sleep_0: 11,
};

export const LUNA_CLIPS: Record<LunaAnimationId, LunaClip> = {
  sit: { frames: [FRAME.sit_0, FRAME.sit_1], fps: 3, loop: true },
  walk: {
    frames: [FRAME.walk_0, FRAME.walk_1, FRAME.walk_2, FRAME.walk_3],
    fps: 8,
    loop: true,
  },
  tail_wag: {
    frames: [FRAME.tail_0, FRAME.tail_1, FRAME.tail_2, FRAME.tail_1],
    fps: 10,
    loop: true,
  },
  bark: {
    frames: [FRAME.bark_0, FRAME.bark_1, FRAME.bark_0, FRAME.bark_1],
    fps: 6,
    loop: true,
  },
  sleep: { frames: [FRAME.sleep_0], fps: 1, loop: true },
};

export function getLunaClip(animation: LunaAnimationId): LunaClip {
  return LUNA_CLIPS[animation];
}
