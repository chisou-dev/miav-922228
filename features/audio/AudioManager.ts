/**
 * AudioManager — sole voice control for games.
 *
 * Ideal game API:
 *   playBgm(stage) · stopBgm() · playSe(id) · setGameState(state) · dispose()
 *
 * BGM: one instance · state machine · pendingStage = latest only (no FIFO).
 * Games never touch AudioContext / timers / oscillators.
 */
import {
  createGameLoop,
  setActiveGameLoop,
  stopActiveGameLoop,
  type GameLoopHandle,
} from "@/features/audio/ambient";
import {
  createBinaryBoot,
  createBlockRotate,
  createBlockSnap,
  createDecoded,
  createFail,
  createFirework,
  createNewRecord,
  createStageClear,
  createStageStart,
} from "@/features/audio/game";
import { createButtonClick } from "@/features/audio/ui";
import {
  disposeSoundEngine,
  ensureAudioReady,
  isSoundMuted,
  muteBgmImmediate,
  setSoundMuted,
} from "@/features/audio/soundEngine";
import { createVictoryJingle } from "@/features/audio/victory";

export type BgmState = "stopped" | "starting" | "playing" | "stopping";

/** High-level scene — drives BGM suppress / resume without event spaghetti. */
export type GameAudioState = "playing" | "clear" | "pause" | "menu";

export type SeId =
  | "snap"
  | "rotate"
  | "reject"
  | "button"
  | "decoded"
  | "firework"
  | "victory"
  | "complete"
  | "level_up"
  | "boot"
  | "stage_start"
  | "error"
  | "clear";

export class AudioManager {
  private static instance: AudioManager | null = null;

  private bgmState: BgmState = "stopped";
  private gameState: GameAudioState = "menu";
  private generation = 0;
  private loop: GameLoopHandle | null = null;
  private currentStage = 1;
  /** Last requested stage (resume after clear / pause). */
  private lastStage = 1;
  /**
   * Latest desired stage while Stopping / racing starts.
   * Always overwritten — never a FIFO queue.
   */
  private pendingStage: number | null = null;
  private suppressed = false;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  getBgmState(): BgmState {
    return this.bgmState;
  }

  getGameState(): GameAudioState {
    return this.gameState;
  }

  isMuted() {
    return isSoundMuted();
  }

  setMuted(muted: boolean) {
    setSoundMuted(muted);
    this.loop?.setMuted(muted);
    if (muted) {
      this.stopBgm({ clearPending: true });
    } else if (this.gameState === "playing" && !this.suppressed) {
      this.playBgm(this.lastStage);
    }
  }

  /**
   * Scene-driven control. Prefer this over manual stop/start sequences.
   * clear → stop BGM · pause → stop · playing → resume · menu → stop + clear pending
   */
  setGameState(
    state: GameAudioState,
    opts?: { stage?: number },
  ) {
    if (opts?.stage != null) {
      this.lastStage = Math.max(1, Math.floor(opts.stage));
    }

    this.gameState = state;

    switch (state) {
      case "clear":
        this.suppressed = true;
        this.stopBgm({ clearPending: true });
        return;
      case "pause":
        this.suppressed = true;
        this.stopBgm({ clearPending: true });
        return;
      case "menu":
        this.suppressed = false;
        this.stopBgm({ clearPending: true });
        return;
      case "playing":
        this.suppressed = false;
        if (!isSoundMuted()) {
          this.playBgm(this.lastStage);
        }
        return;
      default:
        return;
    }
  }

  /** @deprecated Prefer setGameState("clear" | "pause") */
  setSuppressed(value: boolean) {
    this.suppressed = value;
    if (value) this.stopBgm({ clearPending: true });
  }

  isSuppressed() {
    return this.suppressed;
  }

  async unlock() {
    await ensureAudioReady();
  }

  /**
   * Request BGM for `stage`. Rapid calls keep only the latest pendingStage.
   * Example: playBgm(3); playBgm(5); playBgm(9) → only 9 plays.
   * Pass `{ restart: true }` to restart from the beginning even on the same stage.
   */
  playBgm(stage = 1, opts?: { restart?: boolean }) {
    const next = Math.max(1, Math.floor(stage));
    this.lastStage = next;
    const forceRestart = opts?.restart === true;

    if (isSoundMuted() || this.suppressed || this.gameState !== "playing") {
      // Remember desire; do not start until Playing + unmuted
      this.pendingStage = next;
      return;
    }

    switch (this.bgmState) {
      case "playing":
        if (this.currentStage === next && !forceRestart) {
          this.pendingStage = null;
          return;
        }
        this.pendingStage = next;
        void this.beginStop();
        return;
      case "starting":
        // Cancel in-flight start; latest stage wins
        this.pendingStage = next;
        this.generation += 1;
        void this.beginStart(next);
        return;
      case "stopping":
        this.pendingStage = next;
        return;
      case "stopped":
        this.pendingStage = null;
        void this.beginStart(next);
        return;
      default:
        return;
    }
  }

  /** Stop and start current stage BGM from the beginning (no double instance). */
  restartBgm() {
    if (this.gameState !== "playing") return;
    this.playBgm(this.lastStage, { restart: true });
  }

  /** Alias for older call sites. */
  startBgm(stage = 1) {
    this.playBgm(stage);
  }

  stopBgm(opts?: { clearPending?: boolean }) {
    if (opts?.clearPending !== false) {
      this.pendingStage = null;
    }
    switch (this.bgmState) {
      case "stopped":
      case "stopping":
        return;
      case "starting":
      case "playing":
        void this.beginStop();
        return;
      default:
        return;
    }
  }

  async playSe(id: SeId) {
    if (isSoundMuted()) return;
    await ensureAudioReady();
    switch (id) {
      case "snap":
        await createBlockSnap();
        return;
      case "rotate":
        await createBlockRotate();
        return;
      case "reject":
      case "error":
        await createFail();
        return;
      case "button":
        await createButtonClick();
        return;
      case "decoded":
        await createDecoded();
        return;
      case "firework":
        await createFirework();
        return;
      case "victory":
      case "clear":
        await createVictoryJingle();
        return;
      case "complete":
        await createStageClear();
        return;
      case "level_up":
        await createNewRecord();
        return;
      case "boot":
        await createBinaryBoot();
        return;
      case "stage_start":
        await createStageStart();
        return;
      default:
        return;
    }
  }

  /** @deprecated Prefer playSe */
  async play(id: SeId) {
    await this.playSe(id);
  }

  async rotate() {
    await this.playSe("rotate");
  }

  async snap() {
    await this.playSe("snap");
  }

  async button() {
    await this.playSe("button");
  }

  async fail() {
    await this.playSe("reject");
  }

  async firework() {
    await this.playSe("firework");
  }

  async victory() {
    await this.playSe("victory");
  }

  /**
   * Release all audio resources (timers, bus, AudioContext).
   * Safe on React unmount / remount — next unlock() recreates the context.
   */
  dispose() {
    this.pendingStage = null;
    this.generation += 1;
    this.suppressed = false;
    this.gameState = "menu";
    this.tearDownLoop();
    this.bgmState = "stopped";
    disposeSoundEngine();
    AudioManager.instance = null;
  }

  private async beginStart(stage: number) {
    const gen = ++this.generation;
    this.bgmState = "starting";
    this.currentStage = stage;
    this.tearDownLoop();

    try {
      await ensureAudioReady();
      if (
        gen !== this.generation ||
        this.suppressed ||
        isSoundMuted() ||
        this.gameState !== "playing"
      ) {
        if (gen === this.generation) {
          this.bgmState = "stopped";
          // If a newer pending arrived while we were cancelled, honor it later
          // via beginStop's pending pickup or a fresh playBgm.
        }
        return;
      }

      // If pending was overwritten to something else during await, use latest
      const latest = this.pendingStage ?? stage;
      this.pendingStage = null;
      this.currentStage = latest;
      this.lastStage = latest;

      const loop = createGameLoop(latest);
      this.loop = loop;
      setActiveGameLoop(loop);
      await loop.start();

      if (gen !== this.generation) {
        loop.stop();
        if (this.loop === loop) this.loop = null;
        return;
      }

      this.bgmState = "playing";
    } catch {
      if (gen === this.generation) {
        this.tearDownLoop();
        this.bgmState = "stopped";
      }
    }
  }

  private async beginStop() {
    const gen = ++this.generation;
    this.bgmState = "stopping";
    this.tearDownLoop();

    await Promise.resolve();

    if (gen !== this.generation) return;

    this.bgmState = "stopped";

    const pending = this.pendingStage;
    this.pendingStage = null;
    if (
      pending != null &&
      !this.suppressed &&
      !isSoundMuted() &&
      this.gameState === "playing"
    ) {
      void this.beginStart(pending);
    }
  }

  private tearDownLoop() {
    if (this.loop) {
      this.loop.stop();
      this.loop = null;
    }
    stopActiveGameLoop();
    muteBgmImmediate();
  }
}

/** @deprecated Use AudioManager */
export const MiavSound = AudioManager;

/** @deprecated Use AudioManager */
export const Bit8Audio = AudioManager;
