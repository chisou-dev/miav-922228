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
/**
 * 30-second original alien cabin sequence (96 steps x 0.3125 seconds).
 * Returns to its start exactly after thirty seconds. Short "to-to-to"
 * motifs evoke the earlier cockpit chirps, but all four 7.5-second sections
 * vary: playful, curious, uncanny, then an unsettled return to the first
 * phrase. Not four copies of an eight-second loop, and not radio signalling.
 * Pitch numbers index the deliberate in-between notes below; -1 is rest.
 */
const CABIN_NOTES = [
  // 0-7.5: curious, irregularly dancing taps
  0,2,4,3, 1,3,0,-1, 2,5,4,1, 0,3,5,2, 4,-1,2,0, 3,6,4,1,
  // 7.5-15: answering notes with rising curiosity
  2,4,6,4, 3,0,2,1, 4,7,6,-1, 3,5,2,0, 1,4,3,6, 5,2,1,-1,
  // 15-22.5: a cheerful pattern frays into unsettling intervals
  1,3,5,7, 6,3,4,-1, 5,7,8,6, 3,8,5,2, 7,-1,6,4, 2,5,1,3,
  // 22.5-30: darker answer and a recognisable circular return
  6,4,2,5, 7,3,6,-1, 8,4,7,5, 3,1,6,2, 4,3,1,-1, 3,2,0,0,
] as const;
const ALIEN_FREQ = [326,372,407,453,489,551,603,658,704] as const;
const CABIN_STEP_S = 30/CABIN_NOTES.length; // exact 30.0 seconds
const clamp = (x:number,min:number,max:number) =>
  Math.max(min,Math.min(max,x));

function playVoice(
  c:CabinSound,at:number,hz:number,level:number,
  duration:number,wave:OscillatorType,endRatio=0.96,
):void {
  const {ctx,cabinet}=c;
  const osc=ctx.createOscillator();
  const envelope=ctx.createGain();
  osc.type=wave;
  osc.frequency.setValueAtTime(Math.max(30,hz),at);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(30,hz*endRatio),at+duration);
  envelope.gain.setValueAtTime(.0001,at);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.013);
  envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(envelope);
  envelope.connect(cabinet);
  osc.start(at);osc.stop(at+duration+.012);
  osc.onended=()=>{
    try {osc.disconnect();envelope.disconnect();}catch{/* stage closed */ }
  };
}

function strike(c:CabinSound,at:number):void {
  const count=c.beat++;
  const step=count%CABIN_NOTES.length;
  const phrase=Math.floor(step/24);
  // Convert literal union (-1 rests / note indices) to a runtime number
  // and safely bound the lookup; avoids TS tuple index -1 errors.
  const pitchIndex=Number(CABIN_NOTES[step] ?? -1);
  const uneasy=1-c.blood;
  if(pitchIndex>=0){
    const hz=(ALIEN_FREQ[pitchIndex] ?? 407)*
      (1+uneasy*.014*Math.sin(step*.41+phrase*.3));
    const stress=(step%24===0||step%24===12)?1.16:.88;
    const duration=(step%6===2||step%7===0)?.255:.16;
    // First-version organic little "toto" sound, not a pop keyboard.
    playVoice(c,at,hz*(step%4===0?1.17:.81),.16*stress,duration,
      step%3===0?"triangle":"sine",step%4===0?.84:1.14);
    if(step%5===2||step%9===6){
      playVoice(c,at+.086,hz*.91,.065,.105,"sine",1.09);
    }
  }
  // Very restrained hovering cabin undertone; section 3 detunes.
  if(step%12===0){
    const root=[116.4,128.2,119.3,108.1][phrase];
    playVoice(c,at,root,.065,2.15,"triangle",.997);
    playVoice(c,at+.045,root*(phrase===2?1.434:1.504),
      .031,1.70,"sine",1.003);
  }
  // A distant alien shiver in the middle, not a warning beep.
  if(phrase===2&&(step%24===15||step%24===19)){
    playVoice(c,at+.04,719+step*1.1,.046,.32,"sine",.80);
  }
  // The last phrases point back into the opening tone without a sudden
  // rhythmic or amplitude reset when the thirty-second cycle repeats.
}

function schedulePulses(c:CabinSound):void {
  if(c.ctx.state!=="running")return;
  const now=c.ctx.currentTime;
  // If throttled by the phone, resync the beat index as well. Otherwise
  // pauses shift the phrase and break the fixed 30-second music loop.
  if(c.nextPulse<now-.70){
    const skipped=Math.max(0,Math.floor((now-c.nextPulse)/CABIN_STEP_S));
    c.beat+=skipped;
    c.nextPulse+=skipped*CABIN_STEP_S;
    if(c.nextPulse<now-.70)c.nextPulse=now+.02;
  }
  let scheduled=0;
  while(c.nextPulse<now+.25&&scheduled++<3){
    strike(c,Math.max(now+.006,c.nextPulse));
    c.nextPulse+=CABIN_STEP_S;
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
