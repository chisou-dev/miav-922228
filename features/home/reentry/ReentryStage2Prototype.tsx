"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  STAGE2_FLIGHT_S,
  STAGE2_MAX_DEG,
  STAGE2_MIN_DEG,
  STAGE2_MIN_PITCH_DEG,
  STAGE2_MAX_PITCH_DEG,
  STAGE2_ZOOM_STEPS,
  stage2Clamp,
  stage2Evaluate,
  stage2Message,
  type Stage2Outcome,
} from "./reentryStage2Aim";

// A self-contained, low-overhead Stage 2. It shares neither the 120km
// handoff nor Physics v1.1 with Stage 1.
type Phase = "aim" | "flight" | "result";
type Wind = { direction: -1 | 1; strength: number; waveSeed: number };
type View = {
  phase: Phase;
  angle: number;
  power: number;
  zoom: number;
  pitch: number;
  wind: Wind;
  outcome: Stage2Outcome | null;
};
const ease = (value: number) => {
  const t = stage2Clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  time: number,
): void {
  const breathe = Math.sin(time * 1.2) * 0.028;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.055);
  ctx.fillStyle = "#54453e";
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.95, u * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d3a07e";
  ctx.beginPath();
  ctx.moveTo(-0.43 * u, 1.06 * u);
  ctx.lineTo(-0.70 * u, 3.0 * u);
  ctx.lineTo(-0.6 * u, 6.6 * u);
  ctx.lineTo(0.62 * u, 6.6 * u);
  ctx.lineTo(0.72 * u, 3.0 * u);
  ctx.lineTo(0.46 * u, 1.02 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#8b99a0";
  ctx.beginPath();
  ctx.moveTo(-0.7 * u, 2.6 * u);
  ctx.lineTo(0.7 * u, 2.6 * u);
  ctx.lineTo(0.75 * u, 5.1 * u);
  ctx.lineTo(-0.75 * u, 5.1 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3f484d";
  ctx.fillRect(-0.64 * u, 5.1 * u, 0.57 * u, 3.2 * u);
  ctx.fillRect(0.07 * u, 5.1 * u, 0.57 * u, 3.2 * u);

  // The small face becomes readable only through optical zoom.
  const face = ctx.createRadialGradient(
    -0.28 * u, -0.37 * u, 0.04 * u, 0, 0, u * 1.4,
  );
  face.addColorStop(0, "#f3c9a8");
  face.addColorStop(0.7, "#cc957a");
  face.addColorStop(1, "#986d5e");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(0, breathe * u, 0.78 * u, 1.02 * u, -0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#805c54";
  ctx.lineWidth = 0.045 * u;
  ctx.beginPath();
  ctx.moveTo(-0.57 * u, -0.19 * u);
  ctx.quadraticCurveTo(-0.35 * u, -0.27 * u, -0.13 * u, -0.18 * u);
  ctx.moveTo(0.13 * u, -0.18 * u);
  ctx.quadraticCurveTo(0.36 * u, -0.27 * u, 0.59 * u, -0.18 * u);
  ctx.stroke();

  ctx.fillStyle = "#b17a63";
  ctx.beginPath();
  ctx.ellipse(0, 0.2 * u, 0.28 * u, 0.4 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#3f2830";
    ctx.beginPath();
    ctx.ellipse(
      side * 0.18 * u, (0.28 + breathe) * u,
      0.088 * u, 0.064 * u, side * 0.17, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = "#60343c";
  ctx.beginPath();
  ctx.ellipse(0, (0.70 + breathe) * u, 0.29 * u, 0.10 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,197,166,0.7)";
  ctx.lineWidth = 0.026 * u;
  ctx.beginPath();
  ctx.ellipse(0, (0.70 + breathe) * u, 0.29 * u, 0.09 * u, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCoast(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seconds: number,
  zoom: number,
): { x: number; y: number; unit: number } {
  const personX = w * 0.395;
  const faceY = h * 0.546;
  const unit = Math.min(w, h) * 0.0028;

  // From about 3m and closer the camera sees only sand and the person's
  // face. Rendering full-screen sea gradients at 167x is invisible GPU work
  // and can hitch on phones; use a cheap close-up background instead.
  if (zoom > 12) {
    ctx.fillStyle = "#c8b791";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const x = personX + ((i * 17) % 19 - 9) * unit * 2.8;
      const y = faceY + ((i * 11) % 13 - 6) * unit * 3.0;
      ctx.fillStyle = i % 3 ? "rgba(90,81,61,0.12)" : "rgba(241,231,195,0.25)";
      ctx.fillRect(x, y, unit * 0.18, unit * 0.16);
    }
    drawPerson(ctx, personX, faceY, unit, seconds);
    return { x: personX, y: faceY, unit };
  }
  const horizon = h * 0.48;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#1f576f");
  sky.addColorStop(0.54, "#6b9eb0");
  sky.addColorStop(1, "#c4cbc0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 9; i++) {
    const cx = w * ((i * 0.21 + 0.08) % 1);
    const cy = h * (0.12 + (i % 4) * 0.055);
    const cloud = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.075);
    cloud.addColorStop(0, "rgba(248,250,246,0.23)");
    cloud.addColorStop(1, "rgba(248,250,246,0)");
    ctx.fillStyle = cloud;
    ctx.fillRect(cx - h * 0.08, cy - h * 0.08, h * 0.16, h * 0.16);
  }

  const ocean = ctx.createLinearGradient(0, horizon, 0, h);
  ocean.addColorStop(0, "#397d89");
  ocean.addColorStop(0.65, "#195768");
  ocean.addColorStop(1, "#092b3e");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, horizon, w, h - horizon);

  // Distant land and a beach that really remains visible at wide angle.
  ctx.fillStyle = "#3c6465";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.51);
  ctx.lineTo(w * 0.13, h * 0.48);
  ctx.lineTo(w * 0.34, h * 0.46);
  ctx.lineTo(w * 0.59, h * 0.495);
  ctx.lineTo(w, h * 0.47);
  ctx.lineTo(w, h * 0.56);
  ctx.closePath();
  ctx.fill();
  const sand = ctx.createLinearGradient(0, h * 0.51, 0, h * 0.72);
  sand.addColorStop(0, "#998c6b");
  sand.addColorStop(0.48, "#d2be91");
  sand.addColorStop(1, "#bdab84");
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.565);
  ctx.bezierCurveTo(w * 0.3, h * 0.52, w * 0.66, h * 0.59, w, h * 0.55);
  ctx.lineTo(w, h * 0.71);
  ctx.bezierCurveTo(w * 0.77, h * 0.67, w * 0.45, h * 0.72, 0, h * 0.66);
  ctx.closePath();
  ctx.fill();

  // Uneven basalt reefs and breaking foam at both sides of the beach.
  const reefs = [
    [0.09, 0.59, 0.07], [0.19, 0.62, 0.035], [0.73, 0.62, 0.055],
    [0.83, 0.59, 0.085], [0.94, 0.66, 0.05],
  ];
  reefs.forEach(([nx, ny, r], i) => {
    const x = nx * w, y = ny * h, size = r * Math.min(w, h);
    ctx.fillStyle = i % 2 ? "#44565b" : "#384b4e";
    ctx.beginPath();
    ctx.moveTo(x - size, y + size * 0.33);
    ctx.lineTo(x - size * 0.63, y - size * 0.60);
    ctx.lineTo(x - size * 0.16, y - size * 0.84);
    ctx.lineTo(x + size * 0.34, y - size * 0.48);
    ctx.lineTo(x + size * 0.87, y + size * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(230,242,235,0.44)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.3, size * 1.13, size * 0.2, -0.06, 0, Math.PI);
    ctx.stroke();
  });

  // Deliberately few strokes: phone GPU and desktop integrated GPUs both
  // render this without the heavyweight Stage 1 ocean shader.
  for (let i = 0; i < 56; i++) {
    const depth = (i + 0.5) / 56;
    const x = w * ((i * 0.6180339 + 0.23) % 1);
    const y = h * (0.705 + depth * 0.29);
    const shift = Math.sin(seconds * 1.1 + i * 2.7) * w * 0.003;
    ctx.strokeStyle = "rgba(194,231,229," + (0.045 + depth * 0.18) + ")";
    ctx.lineWidth = Math.max(0.6, depth * 1.8);
    ctx.beginPath();
    ctx.moveTo(x + shift, y);
    ctx.quadraticCurveTo(x + depth * w * 0.023, y - 1.6,
      x + depth * w * 0.048, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(50,45,39,0.22)";
  ctx.beginPath();
  ctx.ellipse(personX + unit, faceY + unit * 8.3,
    unit * 3.3, unit * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  drawPerson(ctx, personX, faceY, unit, seconds);
  return { x: personX, y: faceY, unit };
}


/*
 * Main sea view and optical cockpit are deliberately separate canvases.
 * Changing optics never enlarges the main view before LAUNCH.
 * Wind gust and wave drift use fixed math for a shot, not chance on impact.
 */
function driftAt(wind: Wind, p: number): { yaw: number; pitch: number } {
  const progress = ease(p);
  const gust = Math.sin(wind.waveSeed + p * 10.3) * 0.11;
  return {
    yaw: progress * (wind.direction * wind.strength * 0.13 + gust),
    pitch: progress * (
      Math.sin(wind.waveSeed * 1.9 + p * 16.8) * 0.17 +
      Math.cos(p * 21.0 + wind.waveSeed) * 0.07
    ),
  };
}

function drawLook(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  time: number, zoom: number,
  yaw: number, pitch: number,
): void {
  const unit = Math.min(w, h) * 0.0028;
  const faceX = w * 0.395;
  const faceY = h * 0.546;
  // The camera pan tracks a patch of the face, not the nose or mouth.
  // Even at maximum optical zoom the precise aperture is not resolved.
  const lookX = faceX + yaw * unit * 0.10;
  const lookY = faceY + (0.48 + pitch * 0.18) * unit;
  ctx.save();
  ctx.translate(w * 0.5 - lookX * zoom, h * 0.50 - lookY * zoom);
  ctx.scale(zoom, zoom);
  drawCoast(ctx, w, h, time, zoom);
  ctx.restore();
}

function drawSkiff(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  yaw: number, pitch: number, alpha: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(yaw * 0.032 - pitch * 0.018);
  ctx.globalAlpha = alpha;
  const metal = ctx.createLinearGradient(-size, -size, size, size);
  metal.addColorStop(0, "#152e42");
  metal.addColorStop(0.52, "#46798d");
  metal.addColorStop(1, "#061726");
  ctx.fillStyle = metal;
  ctx.strokeStyle = "rgba(170,239,231,0.72)";
  ctx.lineWidth = Math.max(1, size * 0.022);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.90);
  ctx.bezierCurveTo(size * 0.68, -size * 0.60, size, size * 0.36, size * 0.7, size * 0.62);
  ctx.quadraticCurveTo(0, size * 0.90, -size * 0.7, size * 0.62);
  ctx.bezierCurveTo(-size, size * 0.36, -size * 0.68, -size * 0.60, 0, -size * 0.90);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#05151d";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.16, size * 0.38, size * 0.33, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(96,211,191,0.35)";
  ctx.beginPath();ctx.moveTo(0, -size * 0.58);ctx.lineTo(0, -size * 0.15);ctx.stroke();
  ctx.restore();
}

function drawMain(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  time: number, v: View, elapsed: number,
): void {
  ctx.clearRect(0, 0, w, h);
  const p = stage2Clamp(elapsed / STAGE2_FLIGHT_S, 0, 1);
  const drift = driftAt(v.wind, p);
  const viewYaw = v.angle + drift.yaw;
  const viewPitch = v.pitch + drift.pitch;

  // Motion toward the beach, not a pre-launch zoom. Main horizon stays wide
  // while the user operates the binocular scope in the corner.
  const launched = v.phase === "flight" || v.phase === "result";
  const travel = ease((p - 0.08) / 0.89);
  const cameraZoom = launched
    ? 1 + 156 * travel * travel
    : 1;
  drawLook(ctx, w, h, time, cameraZoom, viewYaw, viewPitch);

  if (v.phase === "aim") {
    drawSkiff(ctx,
      w * (0.50 + v.angle * 0.004),
      h * (0.79 + v.pitch * 0.003),
      Math.min(w, h) * 0.055,
      v.angle, v.pitch, 0.95,
    );
  } else if (v.phase === "flight") {
    const r = Math.min(w, h);
    const speed = ease(p);
    // Close water / wake streaks move faster as the craft accelerates.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 32; i++) {
      const seed = (i * 0.6180339 + 0.13) % 1;
      const x = ((seed + p * (0.12 + (i % 7) * 0.018)) % 1) * w;
      const y = h * (0.55 + ((i * 0.317 + time * (0.4 + speed * 2.4)) % 1) * 0.52);
      ctx.strokeStyle = "rgba(184,230,224," + (0.06 + speed * 0.18) + ")";
      ctx.lineWidth = Math.max(0.7, r * 0.0012);
      ctx.beginPath();ctx.moveTo(x, y);
      ctx.lineTo(x + drift.yaw * 2, y + r * (0.006 + speed * 0.035));ctx.stroke();
    }
    ctx.restore();
    const shipFade = 1 - ease((p - 0.68) / 0.25);
    if (shipFade > 0.002) {
      drawSkiff(ctx, w * (0.5 + drift.yaw * 0.015),
        h * (0.80 - speed * 0.27 + drift.pitch * 0.016),
        r * (0.054 - speed * 0.036),
        viewYaw, viewPitch, shipFade);
    }
  }

  if (v.phase === "result" && v.outcome) {
    ctx.fillStyle = "rgba(0,9,18,0.36)";
    ctx.fillRect(0, 0, w, h);
  }
}

function drawOptic(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  time: number, v: View, elapsed: number,
): void {
  const p = stage2Clamp(elapsed / STAGE2_FLIGHT_S, 0, 1);
  const drift = driftAt(v.wind, p);
  // Moving closer naturally increases apparent size, but optics only
  // magnify this small monitor; never magnify the pre-launch main canvas.
  const approach = v.phase === "aim" ? 1 : 1 + 3.0 * ease(p);
  const zoom = Math.min(128, v.zoom * approach);
  ctx.clearRect(0, 0, w, h);
  drawLook(ctx, w, h, time, zoom,
    v.angle + drift.yaw, v.pitch + drift.pitch);
  const cx = w * 0.5, cy = h * 0.5;
  const arm = Math.max(6, Math.min(w, h) * 0.10);
  ctx.strokeStyle = "rgba(167,243,216,0.88)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(cx - arm * 2.4, cy);ctx.lineTo(cx - arm * 0.55, cy);
  ctx.moveTo(cx + arm * 0.55, cy);ctx.lineTo(cx + arm * 2.4, cy);
  ctx.moveTo(cx, cy - arm * 2.4);ctx.lineTo(cx, cy - arm * 0.55);
  ctx.moveTo(cx, cy + arm * 0.55);ctx.lineTo(cx, cy + arm * 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, arm * 0.48, 0, Math.PI * 2);
  ctx.stroke();
}

const control = "touch-manipulation rounded-md border border-cyan-100/40 " +
  "bg-[#061b24]/95 px-2 py-1.5 text-[0.76rem] font-medium text-cyan-50 " +
  "transition-colors active:scale-[0.96] hover:bg-[#13394c] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-100 " +
  "disabled:opacity-30";
const zoomSteps: readonly number[] = STAGE2_ZOOM_STEPS;

export function ReentryStage2Prototype({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opticRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("aim");
  const [angle, setAngle] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [power, setPower] = useState(0.56);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [outcome, setOutcome] = useState<Stage2Outcome | null>(null);
  const [notice, setNotice] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Forecast is visible BEFORE launch; gusts vary continuously during flight.
  const wind: Wind = {
    direction: attempt % 2 === 0 ? -1 : 1,
    strength: 4 - (attempt % 3),
    waveSeed: attempt * 1.731 + 0.77,
  };
  const zoom = zoomSteps[zoomIndex];
  const elapsedRef = useRef(0);
  const viewRef = useRef<View>({
    phase: "aim", angle: 0, pitch: 0, power: 0.56,
    zoom: 1, wind, outcome: null,
  });

  useEffect(() => {
    viewRef.current = { phase, angle, pitch, power, zoom, wind, outcome };
  }, [phase, angle, pitch, power, zoom, outcome, attempt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const optic = opticRef.current;
    const ctx = canvas?.getContext("2d");
    const opticCtx = optic?.getContext("2d");
    if (!canvas || !ctx || !optic || !opticCtx) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min(50, Math.max(0, now - last));
      last = now;
      const v = viewRef.current;
      if (v.phase === "flight") {
        elapsedRef.current = Math.min(STAGE2_FLIGHT_S,
          elapsedRef.current + dt / 1000);
        if (elapsedRef.current >= STAGE2_FLIGHT_S) {
          const d = driftAt(v.wind, 1);
          const result = stage2Evaluate(
            v.angle, v.power, v.pitch, d.yaw, d.pitch);
          viewRef.current = { ...v, phase: "result", outcome: result };
          setOutcome(result);
          setPhase("result");
        }
      }
      for (const c of [canvas, optic]) {
        const w = Math.max(1, Math.round(c.clientWidth));
        const h = Math.max(1, Math.round(c.clientHeight));
        const dpr = Math.min(1.25, window.devicePixelRatio || 1);
        const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
        if (c.width !== pw || c.height !== ph) {
          c.width = pw;
          c.height = ph;
        }
      }
      const dpr = Math.min(1.25, window.devicePixelRatio || 1);
      const cw = Math.max(1, Math.round(canvas.clientWidth));
      const ch = Math.max(1, Math.round(canvas.clientHeight));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMain(ctx, cw, ch, now / 1000,
        viewRef.current, elapsedRef.current);
      const ow = Math.max(1, Math.round(optic.clientWidth));
      const oh = Math.max(1, Math.round(optic.clientHeight));
      opticCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawOptic(opticCtx, ow, oh, now / 1000,
        viewRef.current, elapsedRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const holdDelayRef = useRef<number | null>(null);
  const holdRepeatRef = useRef<number | null>(null);
  const stopHold = useCallback(() => {
    if (holdDelayRef.current !== null) window.clearTimeout(holdDelayRef.current);
    if (holdRepeatRef.current !== null) window.clearInterval(holdRepeatRef.current);
    holdDelayRef.current = null;
    holdRepeatRef.current = null;
  }, []);
  useEffect(() => stopHold, [stopHold]);
  const startHold = (move: () => void) => {
    stopHold();
    holdDelayRef.current = window.setTimeout(() => {
      holdRepeatRef.current = window.setInterval(move, 85);
    }, 280);
  };

  const nudgeAngle = useCallback((delta: number) => {
    if (phase !== "aim") return;
    setAngle(value => Math.round(stage2Clamp(
      value + delta, STAGE2_MIN_DEG, STAGE2_MAX_DEG) * 100) / 100);
  }, [phase]);
  const nudgePitch = useCallback((delta: number) => {
    if (phase !== "aim") return;
    setPitch(value => Math.round(stage2Clamp(
      value + delta, STAGE2_MIN_PITCH_DEG, STAGE2_MAX_PITCH_DEG) * 100) / 100);
  }, [phase]);

  const launch = () => {
    if (phase !== "aim") return;
    elapsedRef.current = 0;
    setOutcome(null);
    setNotice(false);
    setPhase("flight");
  };
  const retry = () => {
    elapsedRef.current = 0;
    setAttempt(v => v + 1);
    setAngle(0);
    setPitch(0);
    setPower(0.56);
    setZoomIndex(0);
    setOutcome(null);
    setNotice(false);
    setPhase("aim");
  };
  const cleared = outcome === "NOSE" || outcome === "MOUTH";
  const interactive = phase === "aim";
  const p = stage2Clamp(elapsedRef.current / STAGE2_FLIGHT_S, 0, 1);
  const drift = driftAt(wind, p);
  const windIcon = wind.direction < 0 ? "←" : "→";

  return (
    <div className="absolute inset-0 z-[90] overflow-hidden bg-[#061e29] text-white"
      role="region" aria-label="Stage 2 — two-axis hovercraft aiming">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full"
        aria-label="Wide sea view with hovercraft; coastline approaches at launch" />
      <div className="pointer-events-none absolute left-3 top-14 z-[92] rounded-sm border-l border-cyan-100/40 bg-black/45 px-3 py-2 font-mono text-[0.61rem] tracking-[0.15em] sm:left-7 sm:top-6">
        STAGE 2 <span className="ml-2 text-cyan-100/65">← COAST</span>
      </div>
      <button type="button" onClick={onClose}
        className={"absolute left-3 top-3 z-[96] " + control}>BACK</button>

      {/* Only this panel contains the optical zoom. AUDIO sits above it. */}
      <div className="absolute right-2 top-[5.4rem] z-[94] w-[min(44vw,18rem)] min-w-[8.7rem] overflow-hidden rounded-md border border-cyan-100/50 bg-[#061823]/95 shadow-[0_6px_22px_rgba(0,0,0,0.65)] sm:right-6 sm:top-[5.5rem]">
        <div className="flex items-center justify-between border-b border-cyan-100/20 px-2 py-1 font-mono text-[0.54rem] tracking-[0.1em] text-cyan-100/80">
          <span>COCKPIT OPTICS</span><span>{Math.round(zoom)}×</span>
        </div>
        <canvas ref={opticRef} className="block aspect-[1.65] w-full"
          aria-label="Zoomed live view toward the distant beach target"/>
        <div className="flex flex-wrap justify-between gap-x-2 border-t border-cyan-100/20 bg-[#061b22]/95 px-2 py-1 font-mono text-[0.59rem] tabular-nums text-cyan-100/90">
          <span>WIND {windIcon} {wind.strength}</span>
          <span>H {angle.toFixed(1)}° V {pitch.toFixed(1)}°</span>
        </div>
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
          <button type="button" className={control+" !px-3 !py-1"}
            disabled={!interactive || zoomIndex===0}
            onClick={()=>setZoomIndex(i=>Math.max(0,i-1))} aria-label="Cockpit zoom out">−</button>
          <span className="font-mono text-[0.57rem] tracking-widest text-cyan-50/65">ZOOM</span>
          <button type="button" className={control+" !px-3 !py-1"}
            disabled={!interactive || zoomIndex===zoomSteps.length-1}
            onClick={()=>setZoomIndex(i=>Math.min(zoomSteps.length-1,i+1))}
            aria-label="Cockpit zoom in">+</button>
        </div>
      </div>

      {/* Colored cockpit switches only peek above the lower hull; functional
          arrows stay fully accessible above these decorative switches. */}
      <div className="pointer-events-none absolute -bottom-4 left-0 right-0 z-[91] h-20 rounded-t-[45%] border-t border-cyan-200/35 bg-gradient-to-b from-[#193e4c]/85 to-[#031018]">
        <div className="mx-auto mt-11 flex w-fit gap-3 opacity-80">
          {["#dc9a44","#6ab89d","#5d9ee0","#da737b","#e0ca66","#8c83e0"].map((color,i)=>(
            <span key={i} className="h-9 w-9 rounded-full border border-white/20 shadow-[0_0_5px_rgba(255,255,255,0.25)]"
              style={{backgroundColor:color}}/>
          ))}
        </div>
      </div>

      {interactive && (
        <div className="absolute inset-x-0 bottom-[7%] z-[95] flex flex-col items-center gap-2 px-2 sm:bottom-[6%]"
          role="group" aria-label="Power and two-axis direction controls">
          <div className="flex items-center gap-2 rounded-md bg-[#051923]/90 px-3 py-1.5">
            <label htmlFor="stage2-power" className="font-mono text-[0.60rem] tracking-[0.11em] text-cyan-50/80">POWER</label>
            <input id="stage2-power" type="range" min="0" max="100" step="1"
              value={Math.round(power*100)}
              onChange={e=>setPower(Number(e.target.value)/100)}
              className="w-[min(31vw,10rem)] accent-amber-300"
              aria-label="Stage 2 propulsion power"/>
            <span className="w-9 font-mono text-[0.67rem] tabular-nums">{Math.round(power*100)}%</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-[#051923]/90 px-2 py-1.5">
            <div className="flex gap-1">
              <button type="button" className={control+" !border-sky-200/65 !bg-[#174e69]"}
                onPointerDown={()=>startHold(()=>nudgeAngle(-0.25))}
                onPointerUp={stopHold} onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onClick={()=>nudgeAngle(-0.25)} aria-label="Turn left">←</button>
              <button type="button" className={control+" !border-sky-200/65 !bg-[#174e69]"}
                onPointerDown={()=>startHold(()=>nudgeAngle(0.25))}
                onPointerUp={stopHold} onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onClick={()=>nudgeAngle(0.25)} aria-label="Turn right">→</button>
            </div>
            <div className="flex gap-1">
              <button type="button" className={control+" !border-emerald-200/65 !bg-[#205d54]"}
                onPointerDown={()=>startHold(()=>nudgePitch(-0.25))}
                onPointerUp={stopHold} onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onClick={()=>nudgePitch(-0.25)} aria-label="Aim up">↑</button>
              <button type="button" className={control+" !border-emerald-200/65 !bg-[#205d54]"}
                onPointerDown={()=>startHold(()=>nudgePitch(0.25))}
                onPointerUp={stopHold} onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onClick={()=>nudgePitch(0.25)} aria-label="Aim down">↓</button>
            </div>
            <button type="button" className={control+" !border-amber-200/80 !bg-[#946027] !px-3"}
              onClick={launch}>LAUNCH</button>
          </div>
          <p className="rounded bg-black/35 px-2 font-mono text-[0.51rem] tracking-[0.08em] text-white/70">
            ← → HEADING · ↑ ↓ ELEVATION · WIND {windIcon} {wind.strength}
          </p>
        </div>
      )}

      {phase==="flight" && (
        <p className="pointer-events-none absolute inset-x-0 top-[17%] z-[92] text-center font-mono text-[0.65rem] tracking-[0.14em] text-white/80">
          HIGH-SPEED APPROACH · GUST & WAVE DRIFT
        </p>
      )}
      {phase==="result" && outcome && (
        <div className="absolute inset-x-0 bottom-[12%] z-[95] flex flex-col items-center gap-2 px-4 text-center">
          <p className={"rounded-md border px-5 py-3 font-mono text-sm tracking-[0.10em] " +
            (cleared ? "border-emerald-200/60 bg-[#062b27]/95" :
              "border-white/30 bg-[#071924]/95")} role="status">
            {stage2Message(outcome)}
          </p>
          <div className="flex gap-2">
            {cleared&&<button type="button" className={control}
              onClick={()=>setNotice(v=>!v)}>STAGE 3</button>}
            <button type="button" className={control} onClick={retry}>RETRY</button>
            <button type="button" className={control} onClick={onClose}>BACK</button>
          </div>
          {notice && <p className="rounded bg-black/60 px-2 py-2 text-xs tracking-widest">STAGE 3 — COMING SOON</p>}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-1 z-[92] text-center font-mono text-[0.47rem] tracking-[0.11em] text-white/40">
        STAGE 2 · OPTICAL / FLIGHT PROTOTYPE
      </div>
    </div>
  );
}
