import type { LunaAnimationClip, LunaFrameId } from "@/engine/luna/atlas";

export type SpriteAnimationState = {
  frameIndex: number;
  elapsedMs: number;
};

/** Advances a clip timeline; returns the active frame id. */
export class SpriteAnimation {
  private frameIndex = 0;
  private elapsedMs = 0;

  constructor(private readonly clip: LunaAnimationClip) {}

  reset() {
    this.frameIndex = 0;
    this.elapsedMs = 0;
  }

  get currentFrameId(): LunaFrameId {
    return this.clip.frames[this.frameIndex] ?? this.clip.frames[0];
  }

  get state(): SpriteAnimationState {
    return { frameIndex: this.frameIndex, elapsedMs: this.elapsedMs };
  }

  advance(deltaMs: number): LunaFrameId {
    if (this.clip.frames.length <= 1) {
      return this.currentFrameId;
    }

    this.elapsedMs += deltaMs;
    while (this.elapsedMs >= this.clip.frameDurationMs) {
      this.elapsedMs -= this.clip.frameDurationMs;
      this.frameIndex += 1;
      if (this.frameIndex >= this.clip.frames.length) {
        if (this.clip.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = this.clip.frames.length - 1;
          this.elapsedMs = 0;
          break;
        }
      }
    }

    return this.currentFrameId;
  }
}

export type AnimationFrame = {
  id: string;
  durationMs: number;
};

/** Generic timeline helper (legacy export). */
export class Animation {
  constructor(private readonly frames: AnimationFrame[]) {}

  get frameCount() {
    return this.frames.length;
  }
}
