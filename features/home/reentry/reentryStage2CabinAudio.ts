/**
 * STAGE 2 cockpit soundscape. Original synthesis rather than a song:
 * playful, malfunctioning instrument chimes plus a muted alien engine.
 * Kept separate from Stage 1 reentry audio/physics and its timeline.
 *
 * Starts only on the user's STAGE 2 click (WebAudio gesture requirement).
 * All nodes are bounded and the context is closed on leaving the stage.
 */
type CabinSound = {
  ctx: AudioContext;
  master: GainNode;
  cabinet: BiquadFilterNode;
  hum: OscillatorNode;
  timer: number;
  nextPulse: number;
  beat: number;
  blood: number;
  thrust: number;
};

let cabin: CabinSound | null = null;
const pitches = [376, 493, 410, 0, 522, 443, 351, 0, 403, 565, 329, 0, 476] as const;
const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));

function strike(c: CabinSound, at: number): void {
  const n = c.beat++;
  const idx = n % pitches.length;
  const hz = pitches[idx];
  if (!hz) return;
  const { ctx, cabinet } = c;
  const decay = idx === 9 ? 0.27 : 0.15;
  const lively = 1 - c.blood;
  const frequency = hz * (1 + Math.sin(n * 1.617) * 0.024);
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();
  osc.type = idx % 4 === 0 ? "triangle" : "sine";
  osc.frequency.setValueAtTime(frequency * (idx % 3 === 0 ? 1.15 : 0.88), at);
  osc.frequency.exponentialRampToValueAtTime(frequency, at + decay);
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.linearRampToValueAtTime((idx % 3 === 0 ? 0.22 : 0.135) * (0.88 + lively * 0.2), at + 0.016);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + decay + 0.13);
  osc.connect(envelope);
  envelope.connect(cabinet);
  osc.start(at);
  osc.stop(at + decay + 0.15);
  osc.onended = () => {
    try { osc.disconnect(); envelope.disconnect(); } catch { /* closed context */ }
  };

  // Occasional dissonant tiny bell is the uncanny part, never a loud alarm.
  if (idx === 4 || idx === 9) {
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = "sine";
    bell.frequency.setValueAtTime(idx === 4 ? 791 : 927, at + 0.07);
    bell.frequency.exponentialRampToValueAtTime(idx === 4 ? 748 : 864, at + 0.30);
    bellGain.gain.setValueAtTime(0.0001, at + 0.07);
    bellGain.gain.linearRampToValueAtTime(0.038, at + 0.10);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.33);
    bell.connect(bellGain);
    bellGain.connect(cabinet);
    bell.start(at + 0.07);
    bell.stop(at + 0.34);
    bell.onended = () => {
      try { bell.disconnect(); bellGain.disconnect(); } catch { /* closed context */ }
    };
  }
}

function schedulePulses(c: CabinSound): void {
  if (c.ctx.state === "closed") return;
  const now = c.ctx.currentTime;
  // Avoid a burst of catch-up notes after a tab or CPU suspension.
  if (c.nextPulse < now - 0.8) c.nextPulse = now + 0.02;
  while (c.nextPulse < now + 0.25) {
    // A slightly lopsided 13-beat mechanical loop, not a regular song.
    strike(c, Math.max(c.nextPulse, now + 0.005));
    const jitter = c.beat % 7 === 0 ? 0.083 : c.beat % 5 === 0 ? -0.024 : 0;
    c.nextPulse += 0.445 - (1 - c.blood) * 0.055 + jitter;
  }
}

export function startStage2CabinAudio(volume: number): void {
  if (cabin) {
    setStage2CabinVolume(volume);
    void cabin.ctx.resume().catch(() => { /* browser audio policy */ });
    return;
  }
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -19;
    compressor.knee.value = 16;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.16;
    compressor.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = clamp(volume, 0, 1) * 0.26;
    master.connect(compressor);

    // Sheltered inside the small hovercraft: high frequencies are rolled off.
    const cabinet = ctx.createBiquadFilter();
    cabinet.type = "lowpass";
    cabinet.frequency.value = 2100;
    cabinet.Q.value = 0.62;
    cabinet.connect(master);

    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = "triangle";
    hum.frequency.value = 115;
    humGain.gain.value = 0.040;
    hum.connect(humGain);
    humGain.connect(cabinet);
    hum.start();

    // Faint second oscillator beats against the main engine; no loud sub-bass.
    const unstable = ctx.createOscillator();
    const unstableGain = ctx.createGain();
    unstable.type = "sine";
    unstable.frequency.value = 118.7;
    unstableGain.gain.value = 0.025;
    unstable.connect(unstableGain);
    unstableGain.connect(cabinet);
    unstable.start();
    // Stop this with the context; don't maintain a separate animation loop.
    const t = ctx.currentTime;
    const c: CabinSound = {
      ctx, master, cabinet, hum, timer: 0,
      nextPulse: t + 0.12, beat: 0, blood: 1, thrust: 0,
    };
    cabin = c;
    c.timer = window.setInterval(() => schedulePulses(c), 110);
    void ctx.resume().catch(() => { /* user can reactivate by touching controls */ });
  } catch {
    // WebAudio unavailable or blocked: gameplay must still work silently.
    stopStage2CabinAudio();
  }
}

export function resumeStage2CabinAudio(): void {
  if (cabin && cabin.ctx.state === "suspended")
    void cabin.ctx.resume().catch(() => {});
}

export function updateStage2CabinAudio(blood: number, thrust: number): void {
  if (!cabin || cabin.ctx.state === "closed") return;
  const c = cabin;
  c.blood = clamp(blood, 0, 1);
  c.thrust = clamp(thrust, 0, 1);
  const now = c.ctx.currentTime;
  c.cabinet.frequency.setTargetAtTime(
    1300 + c.blood * 950 + c.thrust * 250, now, 0.30);
  c.hum.frequency.setTargetAtTime(
    105 + c.thrust * 36 - (1 - c.blood) * 10, now, 0.25);
}

export function setStage2CabinVolume(volume: number): void {
  if (!cabin || cabin.ctx.state === "closed") return;
  cabin.master.gain.setTargetAtTime(
    clamp(volume, 0, 1) * 0.26, cabin.ctx.currentTime, 0.04);
}

export function stopStage2CabinAudio(): void {
  if (!cabin) return;
  const c = cabin;
  cabin = null;
  if (typeof window !== "undefined") window.clearInterval(c.timer);
  if (c.ctx.state !== "closed") {
    c.master.gain.setTargetAtTime(0.0001, c.ctx.currentTime, 0.06);
    // Stop and release ALL pending oscillators/buffers on leaving STAGE 2.
    void c.ctx.close().catch(() => {});
  }
}
