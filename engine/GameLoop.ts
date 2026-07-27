export type GameLoopCallbacks = {
  onTick: (deltaMs: number) => void;
};

/** Shared requestAnimationFrame loop — wire up per game when needed. */
export class GameLoop {
  private frameId: number | null = null;
  private lastTime = 0;

  constructor(private readonly callbacks: GameLoopCallbacks) {}

  start() {
    if (this.frameId !== null) return;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const deltaMs = now - this.lastTime;
      this.lastTime = now;
      this.callbacks.onTick(deltaMs);
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
