/** Shared Luna sprite sheet — single transparent WebP, uniform grid cells. */

export const LUNA_SPRITESHEET_URL = "/characters/luna/spritesheet.webp";

export const LUNA_CELL_PX = 160;

export type LunaFrameId =
  | "sit_0"
  | "sit_1"
  | "walk_0"
  | "walk_1"
  | "walk_2"
  | "walk_3"
  | "tail_0"
  | "tail_1"
  | "tail_2"
  | "bark_0"
  | "bark_1"
  | "sleep_0";

export type LunaFrameRect = {
  id: LunaFrameId;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Must match `FRAME_ORDER` in scripts/build-luna-spritesheet.py */
const FRAME_ORDER: LunaFrameId[] = [
  "sit_0",
  "sit_1",
  "walk_0",
  "walk_1",
  "walk_2",
  "walk_3",
  "tail_0",
  "tail_1",
  "tail_2",
  "bark_0",
  "bark_1",
  "sleep_0",
];

export const LUNA_FRAMES: Record<LunaFrameId, LunaFrameRect> = Object.fromEntries(
  FRAME_ORDER.map((id, index) => [
    id,
    {
      id,
      index,
      x: index * LUNA_CELL_PX,
      y: 0,
      w: LUNA_CELL_PX,
      h: LUNA_CELL_PX,
    },
  ]),
) as Record<LunaFrameId, LunaFrameRect>;

export const LUNA_SHEET_WIDTH = LUNA_CELL_PX * FRAME_ORDER.length;
export const LUNA_SHEET_HEIGHT = LUNA_CELL_PX;

export type LunaAnimationId =
  | "sit"
  | "walk"
  | "tail_wag"
  | "bark"
  | "sleep";

/** @deprecated Use `sit` */
export type LunaAnimationIdLegacy = LunaAnimationId | "idle" | "blink" | "happy" | "side";

export type LunaAnimationClip = {
  id: LunaAnimationId;
  frames: LunaFrameId[];
  frameDurationMs: number;
  loop: boolean;
};

export const LUNA_ANIMATIONS: Record<LunaAnimationId, LunaAnimationClip> = {
  sit: {
    id: "sit",
    frames: ["sit_0", "sit_1"],
    frameDurationMs: 900,
    loop: true,
  },
  walk: {
    id: "walk",
    frames: ["walk_0", "walk_1", "walk_2", "walk_3"],
    frameDurationMs: 180,
    loop: true,
  },
  tail_wag: {
    id: "tail_wag",
    frames: ["tail_0", "tail_1", "tail_2", "tail_1"],
    frameDurationMs: 140,
    loop: true,
  },
  bark: {
    id: "bark",
    frames: ["bark_0", "bark_1", "bark_0"],
    frameDurationMs: 120,
    loop: true,
  },
  sleep: {
    id: "sleep",
    frames: ["sleep_0"],
    frameDurationMs: 1200,
    loop: true,
  },
};

export function getLunaFrameRect(frameId: LunaFrameId): LunaFrameRect {
  return LUNA_FRAMES[frameId];
}

export function resolveLunaAnimation(
  animation: LunaAnimationId | "idle" | "blink" | "happy" | "side",
): LunaAnimationClip {
  switch (animation) {
    case "idle":
    case "sit":
      return LUNA_ANIMATIONS.sit;
    case "walk":
    case "side":
      return LUNA_ANIMATIONS.walk;
    case "tail_wag":
    case "happy":
      return LUNA_ANIMATIONS.tail_wag;
    case "blink":
    case "bark":
      return LUNA_ANIMATIONS.bark;
    case "sleep":
      return LUNA_ANIMATIONS.sleep;
    default:
      return LUNA_ANIMATIONS.sit;
  }
}
