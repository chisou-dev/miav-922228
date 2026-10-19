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
// A recognisable, looping 32-step cabin tune with two answering phrases.
// Warm, almost cheerful intervals return to a deliberately wrong note.
// It is original generative WebAudio synthesis, not radio chatter or an
// imitation of an emergency warning. 0 denotes a breathing space.
const melody = [
  392.00, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00, 0,
  440.00, 523.25, 659.25, 587.33, 523.25, 466.16, 440.00, 392.00,
  349.23, 392.00, 440.00, 523.25, 587.33, 523.25, 440.00, 0,
  392.00, 466.16, 523.25, 587.33, 554.37, 523.25, 440.00, 392.00,
] as const;
const bassLine = [130.81, 146.83, 164.81, 138.59] as const;
const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));

function playVoice(
  c: CabinSound, at: number, frequency: number,
  volume: number, duration: number, wave: OscillatorType,
  cutoffFall = 0.965,
): void {
  const { ctx, cabinet } = c;
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(Math.max(20,frequency),at);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20,frequency*cutoffFall),at+duration,
  );
  envelope.gain.setValueAtTime(0.0001,at);
  envelope.gain.exponentialRampToValueAtTime(
    Math.max(.0002,volume),at+.025,
  );
  envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(envelope);
  envelope.connect(cabinet);
  osc.start(at);
  osc.stop(at+duration+.025);
  osc.onended=()=>{
    try {osc.disconnect();envelope.disconnect();} catch {/* closed */ }
  };
}

function strike(c: CabinSound, at: number): void {
  const step = c.beat++;
  const index=step%melody.length;
  const bloodLoss=1-c.blood;
  const tune=melody[index];

  if(tune>0){
    // Longer rounded toy-organ notes connect across steps: this is a
    // melody rather than individual communication blips.
    const accent=index%8===0?1.24:index%4===0?1.10:0.88;
    const slightlyWrong = bloodLoss * (
      0.014 * Math.sin(step*.73) + (index===28?.017:0)
    );
    const hz=tune*(1+slightlyWrong);
    const hold=index%8===3||index%8===4?.58:.41;
    playVoice(c,at,hz,.20*accent,hold,"triangle");
    playVoice(c,at+.022,hz*2.004,.036*accent,hold*.85,"sine");
  }

  // Four chords repeat in a 10.5 second phrase, drifting between a
  // playful major character and sour minor-second tension.
  if(index%8===0){
    const chord=bassLine[Math.floor(index/8)];
    playVoice(c,at,chord,.15,2.0,"sine",.999);
    playVoice(c,at+.04,chord*1.5,.060,1.84,"triangle",1.002);
    const tension = index===24 ? Math.pow(2,1/12) : 1.25;
    playVoice(c,at+.06,chord*2*tension,.042,1.55,"sine",.998);
  }
  // Tactile wooden pulse on each quarter-note, no random signal bursts.
  if(index%2===0){
    playVoice(c,at,118,.028,.105,"sine",.60);
  }
  // A tiny, deliberately sour answer only at the end of the second phrase.
  if(index===28){
    playVoice(c,at+.09,740*(1+bloodLoss*.022),.055,.35,"sine",.92);
  }
}

function schedulePulses(c: CabinSound): void {
  if(c.ctx.state!=="running")return;
  const now=c.ctx.currentTime;
  // Never catch up a backlog if a smartphone suspends the audio context.
  if(c.nextPulse<now-.7)c.nextPulse=now+.025;
  let scheduled=0;
  while(c.nextPulse<now+.30 && scheduled++<3){
    const step=c.beat;
    strike(c,Math.max(now+.006,c.nextPulse));
    // Gentle 3+3+2 swing keeps the melody jaunty while still flowing.
    const swing=[.015,-.012,.018,-.009,.015,-.018,.013,-.022][step%8];
    c.nextPulse+=.327+swing-c.thrust*.008;
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
    master.gain.value = clamp(volume, 0, 1) * 0.24;
    master.connect(compressor);

    // Sheltered inside the small hovercraft: high frequencies are rolled off.
    const cabinet = ctx.createBiquadFilter();
    cabinet.type = "lowpass";
    cabinet.frequency.value = 2550;
    cabinet.Q.value = 0.62;
    cabinet.connect(master);

    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    const wobble = ctx.createOscillator();
    const wobbleDepth = ctx.createGain();
    wobble.type = "sine";
    wobble.frequency.value = 4.7;
    wobbleDepth.gain.value = 3.4;
    wobble.connect(wobbleDepth);
    wobbleDepth.connect(hum.frequency);
    wobble.start();
    hum.type = "triangle";
    hum.frequency.value = 115;
    humGain.gain.value = 0.029;
    hum.connect(humGain);
    humGain.connect(cabinet);
    hum.start();

    // Faint second oscillator beats against the main engine; no loud sub-bass.
    const unstable = ctx.createOscillator();
    const unstableGain = ctx.createGain();
    unstable.type = "sine";
    unstable.frequency.value = 119.9;
    unstableGain.gain.value = 0.020;
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
    1680 + c.blood * 850 + c.thrust * 180, now, 0.30);
  c.hum.frequency.setTargetAtTime(
    105 + c.thrust * 36 - (1 - c.blood) * 10, now, 0.25);
}

export function setStage2CabinVolume(volume: number): void {
  if (!cabin || cabin.ctx.state === "closed") return;
  cabin.master.gain.setTargetAtTime(
    clamp(volume, 0, 1) * 0.24, cabin.ctx.currentTime, 0.04);
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
