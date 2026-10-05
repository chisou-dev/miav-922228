import { mixU32 } from "./seededRandom";
import type { ReentryFrame } from "./reentryTypes";

export const MAX_OUTPUT_FRAMES = 480;

/**
 * Deterministic downsample for replay / canvas playback.
 * Full-fidelity simulation steps are not reduced — only stored frames.
 */
export function resampleReentryFrames(
  frames: ReentryFrame[],
  seed: number,
  maxFrames: number = MAX_OUTPUT_FRAMES,
): ReentryFrame[] {
  if (frames.length <= maxFrames) {
    return frames.map((f) => ({ ...f }));
  }

  const mustKeep = new Set<number>([0, frames.length - 1]);
  let maxHeatIdx = 0;
  let maxQIdx = 0;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].heatFluxWm2 >= frames[maxHeatIdx].heatFluxWm2) {
      maxHeatIdx = i;
    }
    if (frames[i].dynamicPressurePa >= frames[maxQIdx].dynamicPressurePa) {
      maxQIdx = i;
    }
  }
  mustKeep.add(maxHeatIdx);
  mustKeep.add(maxQIdx);

  const picked = new Set<number>(mustKeep);

  for (let k = 0; k < maxFrames; k++) {
    const uniformIdx = Math.round(
      (k / (maxFrames - 1)) * (frames.length - 1),
    );
    picked.add(uniformIdx);
    if (picked.size >= maxFrames) break;
  }

  let fill = 0;
  while (picked.size < maxFrames && fill < frames.length * 2) {
    const h = mixU32(seed, fill, frames.length, maxFrames);
    picked.add(h % frames.length);
    fill++;
  }

  const indices = [...picked].sort((a, b) => a - b).slice(0, maxFrames);
  return indices.map((i) => ({ ...frames[i] }));
}
