"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  STAGE2_FLIGHT_S,
  STAGE2_MAX_DEG,
  STAGE2_MIN_DEG,
  STAGE2_ZOOM_STEPS,
  stage2AimPoint,
  stage2Clamp,
  stage2Evaluate,
  stage2Message,
  type Stage2Outcome,
} from "./reentryStage2Aim";

// A self-contained, low-overhead Stage 2. It shares neither the 120km
// handoff nor Physics v1.1 with Stage 1.
type Phase = "aim" | "flight" | "result";
type View = {
  phase: Phase;
  angle: number;
  power: number;
  zoom: number;
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

function drawCockpitOverlay(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  time: number, zoom: number, angle: number, power: number,
  phase: Phase, elapsed: number, outcome: Stage2Outcome | null,
): void {
  const s = Math.min(w, h);
  ctx.save();
  const rim = ctx.createLinearGradient(0, 0, w, h);
  rim.addColorStop(0, "rgba(3,14,20,0.88)");
  rim.addColorStop(0.5, "rgba(11,33,42,0.55)");
  rim.addColorStop(1, "rgba(1,7,11,0.94)");
  ctx.lineWidth = Math.max(12, s * 0.045);
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.39);
  ctx.quadraticCurveTo(w * 0.08, h * 0.01, w * 0.37, h * 0.018);
  ctx.quadraticCurveTo(w * 0.64, h * 0.007, w * 0.97, h * 0.33);
  ctx.stroke();
  ctx.fillStyle = "rgba(1,9,15,0.86)";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.89);
  ctx.quadraticCurveTo(w * 0.23, h * 0.82, w * 0.50, h * 0.87);
  ctx.quadraticCurveTo(w * 0.78, h * 0.83, w, h * 0.87);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(73,154,169,0.32)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.89);
  ctx.quadraticCurveTo(w * 0.49, h * 0.81, w, h * 0.87);
  ctx.stroke();

  const cx = w * 0.5, cy = h * 0.51, r = Math.max(8, s * 0.014);
  ctx.strokeStyle = phase === "result"
    ? outcome === "NOSE" || outcome === "MOUTH"
      ? "rgba(139,251,211,0.95)" : "rgba(255,168,135,0.94)"
    : "rgba(160,240,224,0.78)";
  ctx.lineWidth = Math.max(0.9, s * 0.0018);
  ctx.beginPath();
  ctx.moveTo(cx - r * 2.1, cy);
  ctx.lineTo(cx - r * 0.65, cy);
  ctx.moveTo(cx + r * 0.65, cy);
  ctx.lineTo(cx + r * 2.1, cy);
  ctx.moveTo(cx, cy - r * 2.1);
  ctx.lineTo(cx, cy - r * 0.65);
  ctx.moveTo(cx, cy + r * 0.65);
  ctx.lineTo(cx, cy + r * 2.1);
  ctx.arc(cx, cy, r * 0.60, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillStyle = "rgba(175,231,223,0.74)";
  const range = phase === "flight"
    ? Math.max(0.3, 50 * (1 - elapsed / STAGE2_FLIGHT_S))
    : phase === "result" ? 0.3 : 50;
  ctx.fillText("RANGE " + range.toFixed(1) + " M", 22, h * 0.74);
  ctx.fillText("← COAST  /  HEADING " + angle.toFixed(1) + "°", 22, h * 0.78);
  ctx.fillText("OPTIC " + Math.round(zoom) + "X  /  POWER " +
    Math.round(power * 100) + "%", 22, h * 0.82);
  if (phase === "flight") {
    const p = stage2Clamp(elapsed / STAGE2_FLIGHT_S, 0, 1);
    const pulse = 0.47 + Math.sin(time * 8) * 0.22;
    ctx.fillStyle = "rgba(114,238,206," + pulse + ")";
    ctx.fillRect(cx - r * 0.14, cy - r * 0.14, r * 0.28, r * 0.28);
    ctx.strokeStyle = "rgba(131,217,220,0.42)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1.25 + p * 3), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStage2(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  time: number, view: View, elapsed: number,
): void {
  ctx.clearRect(0, 0, w, h);
  const p = stage2Clamp(elapsed / STAGE2_FLIGHT_S, 0, 1);
  const launchZoom = view.phase === "flight" || view.phase === "result"
    ? 1 + 166 * ease((p - 0.13) / 0.74)
    : 1;
  const zoom = Math.max(view.zoom, launchZoom);
  const faceX = w * 0.395;
  const faceY = h * 0.546;
  const unit = Math.min(w, h) * 0.0028;
  const aim = stage2AimPoint(view.angle);
  const focusX = faceX + aim.x * unit;
  const focusY = faceY + aim.y * unit;

  // Optical zoom moves the entire shoreline through one continuous
  // camera transform, with the selected aperture centred in the reticle.
  ctx.save();
  ctx.translate(w * 0.5 - focusX * zoom, h * 0.51 - focusY * zoom);
  ctx.scale(zoom, zoom);
  drawCoast(ctx, w, h, time, zoom);
  ctx.restore();

  // A non-graphic fictional hit effect: a flash and the result readout.
  if (view.phase === "flight" && p > 0.84) {
    const pulse = ease((p - 0.84) / 0.14);
    const g = ctx.createRadialGradient(
      w * 0.5, h * 0.51, 0, w * 0.5, h * 0.51, h * 0.29,
    );
    g.addColorStop(0, "rgba(121,246,225," + (pulse * 0.27) + ")");
    g.addColorStop(1, "rgba(121,246,225,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (view.phase === "result") {
    ctx.fillStyle = "rgba(1,9,14,0.19)";
    ctx.fillRect(0, 0, w, h);
    // A fast pass is non-graphic: a tiny receding streak appears BEYOND
    // the target rather than a still image claiming it penetrated.
    if (view.outcome === "TOO_FAST") {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const streak = ctx.createLinearGradient(w * 0.4, h * 0.63, w, h * 0.24);
      streak.addColorStop(0, "rgba(120,234,228,0)");
      streak.addColorStop(0.65, "rgba(140,251,234,0.50)");
      streak.addColorStop(1, "rgba(178,254,244,0)");
      ctx.strokeStyle = streak;
      ctx.lineWidth = Math.max(1.5, h * 0.004);
      ctx.beginPath();
      ctx.moveTo(w * 0.4, h * 0.63);
      ctx.lineTo(w * 1.1, h * 0.18);
      ctx.stroke();
      ctx.restore();
    }
  }
  drawCockpitOverlay(
    ctx, w, h, time, zoom, view.angle, view.power,
    view.phase, elapsed, view.outcome,
  );
}

const control = "touch-manipulation rounded-sm border border-cyan-100/35 " +
  "bg-[#071a22]/90 px-3 py-2 text-[0.76rem] tracking-[0.08em] " +
  "text-cyan-50 transition-colors hover:bg-[#123541] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-100 " +
  "disabled:opacity-35";
const zoomSteps: readonly number[] = STAGE2_ZOOM_STEPS;

export function ReentryStage2Prototype({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("aim");
  const [angle, setAngle] = useState(0);
  const [power, setPower] = useState(0.5);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [outcome, setOutcome] = useState<Stage2Outcome | null>(null);
  const [notice, setNotice] = useState(false);
  const elapsedRef = useRef(0);
  const viewRef = useRef<View>({
    phase: "aim", angle: 0, power: 0.5, zoom: 1, outcome: null,
  });
  const zoom = zoomSteps[zoomIndex];
  viewRef.current = { phase, angle, power, zoom, outcome };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let previous = 0;
    const tick = (now: number) => {
      if (previous === 0) previous = now;
      const dt = Math.min(50, Math.max(0, now - previous));
      previous = now;
      const v = viewRef.current;
      if (v.phase === "flight") {
        elapsedRef.current = Math.min(
          STAGE2_FLIGHT_S, elapsedRef.current + dt / 1000,
        );
        if (elapsedRef.current >= STAGE2_FLIGHT_S) {
          const finalOutcome = stage2Evaluate(v.angle, v.power);
          viewRef.current = { ...v, phase: "result", outcome: finalOutcome };
          setOutcome(finalOutcome);
          setPhase("result");
        }
      }
      const w = Math.max(1, Math.round(canvas.clientWidth));
      const h = Math.max(1, Math.round(canvas.clientHeight));
      const dpr = Math.min(1.25, window.devicePixelRatio || 1);
      const pw = Math.floor(w * dpr);
      const ph = Math.floor(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStage2(ctx, w, h, now / 1000, viewRef.current, elapsedRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nudge = useCallback((delta: number) => {
    setAngle(value => Math.round(stage2Clamp(
      value + delta, STAGE2_MIN_DEG, STAGE2_MAX_DEG,
    ) * 100) / 100);
  }, []);

  const launch = () => {
    if (phase !== "aim") return;
    elapsedRef.current = 0;
    setOutcome(null);
    setNotice(false);
    setPhase("flight");
  };
  const retry = () => {
    elapsedRef.current = 0;
    setAngle(0);
    setPower(0.5);
    setZoomIndex(0);
    setOutcome(null);
    setNotice(false);
    setPhase("aim");
  };

  const cleared = outcome === "NOSE" || outcome === "MOUTH";
  const interactive = phase === "aim";

  return (
    <div
      className="absolute inset-0 z-[90] overflow-hidden bg-[#061e29] text-white"
      role="region"
      aria-label="Stage 2 — coastline approach"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Cockpit viewport showing a distant person, beach and rocky reefs"
      />

      <div className="pointer-events-none absolute left-3 top-14 z-[92] rounded-sm border-l border-cyan-100/40 bg-black/45 px-3 py-2 font-mono text-[0.62rem] tracking-[0.16em] sm:left-7 sm:top-6">
        STAGE 2 <span className="ml-2 text-cyan-100/60">← COAST</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className={"absolute left-3 top-3 z-[95] sm:left-auto sm:right-4 sm:top-4 " + control}
      >
        BACK
      </button>

      {/* Small overhead craft/cockpit display: kept below the AUDIO control. */}
      <div className="pointer-events-none absolute right-3 top-[5.5rem] z-[92] w-[8.5rem] rounded-md border border-cyan-100/25 bg-[#031521]/75 p-2 font-mono text-[0.58rem] text-cyan-100/75 sm:right-5 sm:w-[11rem]">
        <div className="mb-1 flex justify-between text-[0.54rem] tracking-[0.15em]">
          <span>COCKPIT</span><span>OPTICS</span>
        </div>
        <svg viewBox="0 0 160 65" className="h-12 w-full sm:h-14" aria-hidden="true">
          <path d="M10 47 Q80 61 150 47 L137 30 Q84 12 24 30Z" fill="#193b49" stroke="#6daeba" strokeWidth="1.5"/>
          <ellipse cx="80" cy="38" rx="36" ry="9" fill="#071821" stroke="#8bc2c2"/>
          <path d="M69 35 L80 18 L91 35" fill="none" stroke="#8bdbcf" strokeWidth="2"/>
          <path d="M20 16 H45 M115 16 H140 M80 9 V17" stroke="#6daeba" strokeWidth="1"/>
          <path d="M16 56 H144" stroke="#477b86" strokeDasharray="4 4"/>
        </svg>
        <div className="flex justify-between tabular-nums">
          <span>50M → 0.30M</span><span>{Math.round(zoom)}X</span>
        </div>
      </div>

      {interactive && (
        <>
          <div
            className="absolute inset-x-0 bottom-[20%] z-[92] flex flex-col items-center gap-2 px-3 sm:bottom-[18%]"
            role="group"
            aria-label="Zoom, heading and power controls"
          >
            <div className="flex items-center gap-2 rounded-sm bg-[#061822]/80 px-2 py-1">
              <span className="mr-1 font-mono text-[0.58rem] tracking-[0.12em] text-cyan-50/70">ZOOM</span>
              <button
                type="button"
                className={control}
                disabled={zoomIndex === 0}
                onClick={() => setZoomIndex(v => Math.max(0, v - 1))}
                aria-label="Zoom out"
              >−</button>
              <span className="min-w-12 text-center font-mono text-xs tabular-nums">{Math.round(zoom)}X</span>
              <button
                type="button"
                className={control}
                disabled={zoomIndex === zoomSteps.length - 1}
                onClick={() => setZoomIndex(v => Math.min(zoomSteps.length - 1, v + 1))}
                aria-label="Zoom in"
              >+</button>
            </div>
            <div className="flex items-center gap-1.5 rounded-sm bg-[#061822]/85 px-2 py-1">
              <span className="mr-1 font-mono text-[0.57rem] tracking-[0.09em] text-cyan-50/70">DIRECTION</span>
              <button className={control} type="button" onClick={() => nudge(-1)} aria-label="Aim left one degree">−1°</button>
              <button className={control} type="button" onClick={() => nudge(-0.1)} aria-label="Aim left 0.1 degree">−0.1°</button>
              <span className="min-w-[3.8rem] text-center font-mono text-[0.72rem] tabular-nums">{angle.toFixed(1)}°</span>
              <button className={control} type="button" onClick={() => nudge(0.1)} aria-label="Aim right 0.1 degree">+0.1°</button>
              <button className={control} type="button" onClick={() => nudge(1)} aria-label="Aim right one degree">+1°</button>
            </div>
            <div className="flex w-full max-w-[21rem] items-center gap-3 rounded-sm bg-[#061822]/85 px-3 py-2">
              <label htmlFor="s2-power" className="font-mono text-[0.64rem] tracking-[0.10em]">POWER</label>
              <input
                id="s2-power"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(power * 100)}
                onChange={e => setPower(Number(e.target.value) / 100)}
                className="min-w-0 flex-1 accent-cyan-200"
                aria-label="Stage 2 propulsion power"
              />
              <span className="w-9 text-right font-mono text-xs tabular-nums">{Math.round(power * 100)}%</span>
            </div>
            <button
              type="button"
              className={control + " min-w-36 border-cyan-100/65"}
              onClick={launch}
            >
              LAUNCH
            </button>
          </div>
        </>
      )}

      {phase === "flight" && (
        <div className="pointer-events-none absolute inset-x-0 top-[17%] z-[92] text-center font-mono text-[0.7rem] tracking-[0.18em] text-cyan-100/80">
          COURSE LOCKED · APPROACHING SHORE
        </div>
      )}

      {phase === "result" && outcome && (
        <div className="absolute inset-x-0 bottom-[8%] z-[94] flex flex-col items-center gap-3 px-4 text-center">
          <p
            className={"max-w-sm rounded-sm border px-5 py-3 font-mono text-sm tracking-[0.12em] " +
              (cleared ? "border-emerald-200/55 bg-[#062c29]/95" : "border-white/30 bg-[#071b25]/95")}
            role="status"
          >
            {stage2Message(outcome)}
          </p>
          <div className="flex gap-3">
            {cleared && (
              <button type="button" className={control} onClick={() => setNotice(v => !v)}>
                STAGE 3
              </button>
            )}
            <button type="button" className={control} onClick={retry}>RETRY</button>
            <button type="button" className={control} onClick={onClose}>BACK</button>
          </div>
          {notice && <p className="rounded-sm bg-black/65 px-3 py-2 text-xs tracking-wider">STAGE 3 — COMING SOON</p>}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[92] text-center font-mono text-[0.49rem] tracking-[0.11em] text-white/50">
        STAGE 2 · EXPERIMENTAL COCKPIT / FIXED TARGET · NO RANDOM WIN ROLL
      </div>
    </div>
  );
}
