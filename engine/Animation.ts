export type AnimationFrame = {
  id: string;
  durationMs: number;
};

/** Timeline helper — expand when sprite sheets ship. */
export class Animation {
  constructor(private readonly frames: AnimationFrame[]) {}

  get frameCount() {
    return this.frames.length;
  }
}
