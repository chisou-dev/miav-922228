"use client";

import { useEffect, useRef } from "react";
import {
  playbackToFrameProgress,
  presentationHeatGlow,
} from "./reentryPlayback";
import type { ReentryArtVariant } from "./reentryArtPresentation";
import type { ReentryOutcome, ReentryPhase, ReentryResult } from "./reentryTypes";
import { restFrame, sampleFrame } from "./reentryVisual";

const EARTH_SOURCE = "/reentry/source/stage1-space-earth-original.jpg";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hash01(seed: number, n: number): number {
  let x = (seed ^ Math.imul(n + 1, 0x45d9f3b)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 0xffffffff;
}

function cubic(
  a: number,
  b: number,
  c: number,
  d: number,
  t: number,
): number {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

interface Point {
  x: number;
  y: number;
}

interface EarthView {
  x: number;
  y: number;
  r: number;
}

function earthView(
  playback: number,
  outcome: ReentryOutcome | undefined,
  idle: boolean,
  w: number,
  h: number,
): EarthView {
  if (idle) {
    const r = w * 0.072;
    return {
      x: w * 0.14,
      y: h - r - Math.min(w, h) * 0.055,
      r,
    };
  }

  const approach = smoothstep(playback / 0.62);
  const close = smoothstep((playback - 0.46) / 0.38);

  let r = w * (0.072 + 0.14 * approach + 0.72 * close);
  let x = mix(w * 0.14, w * 0.17, close);
  let y = mix(
    h - r - Math.min(w, h) * 0.055,
    h + r * 0.18,
    close,
  );

  if (outcome === "SKIP" && playback > 0.68) {
    const retreat = smoothstep((playback - 0.68) / 0.3);
    r *= mix(1, 0.34, retreat);
    x = mix(x, w * 0.11, retreat);
    y = mix(y, h * 0.84, retreat);
  }

  return { x, y, r };
}

function basePathPoint(
  playback: number,
  outcome: ReentryOutcome | undefined,
  w: number,
  h: number,
): Point {
  const start = { x: w * 0.80, y: h * 0.15 };

  // The first half is a wide establishing shot.  The craft advances only
  // modestly while Earth begins to grow, which gives a sense of distance.
  if (playback <= 0.58) {
    const t = smoothstep(playback / 0.58);
    return {
      x: cubic(start.x, w * 0.79, w * 0.69, w * 0.57, t),
      y: cubic(start.y, h * 0.19, h * 0.31, h * 0.40, t),
    };
  }

  const t = smoothstep((playback - 0.58) / 0.42);
  const entry = { x: w * 0.57, y: h * 0.40 };

  if (outcome === "SKIP") {
    return {
      x: cubic(entry.x, w * 0.48, w * 0.61, w * 0.82, t),
      y: cubic(entry.y, h * 0.49, h * 0.36, h * 0.22, t),
    };
  }

  if (outcome === "EARTH_REACHED") {
    return {
      x: cubic(entry.x, w * 0.54, w * 0.47, w * 0.39, t),
      y: cubic(entry.y, h * 0.50, h * 0.61, h * 0.72, t),
    };
  }

  return {
    x: cubic(entry.x, w * 0.54, w * 0.50, w * 0.47, t),
    y: cubic(entry.y, h * 0.48, h * 0.55, h * 0.59, t),
  };
}

function craftPose(
  playback: number,
  outcome: ReentryOutcome | undefined,
  angleNorm: number,
  idle: boolean,
  w: number,
  h: number,
): { x: number; y: number; angle: number } {
  if (idle) {
    const p = basePathPoint(0, undefined, w, h);
    const q = basePathPoint(0.01, undefined, w, h);
    const base = Math.atan2(q.y - p.y, q.x - p.x);
    return {
      ...p,
      angle: base + (angleNorm - 0.5) * 0.36,
    };
  }

  const p = basePathPoint(playback, outcome, w, h);
  const q = basePathPoint(Math.min(1, playback + 0.008), outcome, w, h);
  const base = Math.atan2(q.y - p.y, q.x - p.x);
  return {
    ...p,
    angle: base + (angleNorm - 0.5) * 0.28,
  };
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  playback: number,
  moving: boolean,
): void {
  const streak = moving ? smoothstep((playback - 0.12) / 0.42) : 0;

  ctx.save();
  for (let i = 0; i < 46; i++) {
    const x = (((i * 89 + 17) % 101) / 101) * w;
    const y = (((i * 47 + 29) % 103) / 103) * h;
    const alpha = 0.12 + (i % 6) * 0.045;
    const size = i % 9 === 0 ? 1.35 : 0.8;

    ctx.strokeStyle = `rgba(225,235,245,${alpha})`;
    ctx.fillStyle = `rgba(225,235,245,${alpha})`;

    if (streak > 0.04 && i % 3 === 0) {
      const len = (3 + (i % 5) * 2) * streak;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * 0.7, y - len);
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, size, size);
    }
  }
  ctx.restore();
}

function drawEarth(
  ctx: CanvasRenderingContext2D,
  earth: HTMLImageElement | null,
  view: EarthView,
  heat: number,
): void {
  const { x, y, r } = view;

  // Soft blue atmospheric halo, especially readable during the close approach.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(x, y, r * 0.94, x, y, r * 1.08);
  halo.addColorStop(0, "rgba(80,160,255,0)");
  halo.addColorStop(0.52, `rgba(90,175,255,${0.12 + heat * 0.08})`);
  halo.addColorStop(0.72, `rgba(170,220,255,${0.26 + heat * 0.1})`);
  halo.addColorStop(1, "rgba(80,150,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  if (earth && earth.naturalWidth > 0) {
    // Apollo 17 Blue Marble.  Crop the actual globe out of the square source,
    // rather than re-cropping the already-composited stage1-space-earth.webp.
    const size = Math.min(earth.naturalWidth, earth.naturalHeight);
    const sx = earth.naturalWidth * 0.165;
    const sy = earth.naturalHeight * 0.165;
    const sw = size * 0.67;
    const sh = size * 0.67;
    ctx.drawImage(earth, sx, sy, sw, sh, x - r, y - r, r * 2, r * 2);
  } else {
    const fallback = ctx.createRadialGradient(
      x - r * 0.28,
      y - r * 0.32,
      r * 0.12,
      x,
      y,
      r,
    );
    fallback.addColorStop(0, "#5383a7");
    fallback.addColorStop(0.55, "#173b59");
    fallback.addColorStop(1, "#06111d");
    ctx.fillStyle = fallback;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Slight night-side falloff gives the globe depth even in a small view.
  const shade = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  shade.addColorStop(0, "rgba(0,0,0,0.02)");
  shade.addColorStop(0.58, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = shade;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(170,220,255,0.42)";
  ctx.lineWidth = Math.max(1, r * 0.008);
  ctx.shadowColor = "rgba(90,170,255,0.62)";
  ctx.shadowBlur = Math.max(5, r * 0.035);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.003, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function craftOutline(
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
): void {
  ctx.beginPath();
  ctx.moveTo(length * 0.58, 0);
  ctx.bezierCurveTo(
    length * 0.44,
    -width * 0.14,
    length * 0.25,
    -width * 0.2,
    length * 0.08,
    -width * 0.22,
  );
  ctx.lineTo(-length * 0.25, -width * 0.47);
  ctx.lineTo(-length * 0.54, -width * 0.34);
  ctx.lineTo(-length * 0.43, 0);
  ctx.lineTo(-length * 0.54, width * 0.34);
  ctx.lineTo(-length * 0.25, width * 0.47);
  ctx.lineTo(length * 0.08, width * 0.22);
  ctx.bezierCurveTo(
    length * 0.25,
    width * 0.2,
    length * 0.44,
    width * 0.14,
    length * 0.58,
    0,
  );
  ctx.closePath();
}

function drawCraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  alpha: number,
  heat: number,
): void {
  const width = length * 0.64;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  // The lower heat-shield silhouette gives the vehicle thickness and prevents
  // it from reading as a flat icon.
  ctx.save();
  ctx.translate(-length * 0.025, length * 0.035);
  craftOutline(ctx, length, width);
  ctx.fillStyle = "#11171c";
  ctx.shadowColor = heat > 0.15 ? `rgba(255,90,28,${0.3 + heat * 0.45})` : "rgba(0,0,0,0.75)";
  ctx.shadowBlur = heat > 0.15 ? 14 + heat * 24 : 8;
  ctx.fill();
  ctx.restore();

  craftOutline(ctx, length, width);
  const hull = ctx.createLinearGradient(-length * 0.5, -width * 0.2, length * 0.58, width * 0.16);
  hull.addColorStop(0, "#767c80");
  hull.addColorStop(0.25, "#d6d8d6");
  hull.addColorStop(0.58, "#f2f0e9");
  hull.addColorStop(0.82, "#c7cbca");
  hull.addColorStop(1, "#a7adb0");
  ctx.fillStyle = hull;
  ctx.fill();

  ctx.save();
  craftOutline(ctx, length, width);
  ctx.clip();

  const underside = ctx.createLinearGradient(0, -width * 0.42, 0, width * 0.5);
  underside.addColorStop(0.45, "rgba(20,24,28,0)");
  underside.addColorStop(0.62, "rgba(10,14,18,0.24)");
  underside.addColorStop(1, "rgba(3,5,7,0.82)");
  ctx.fillStyle = underside;
  ctx.fillRect(-length, -width, length * 2, width * 2);

  // Center spine and subtle panel lines.
  ctx.strokeStyle = "rgba(35,45,52,0.22)";
  ctx.lineWidth = Math.max(0.7, length * 0.008);
  ctx.beginPath();
  ctx.moveTo(-length * 0.4, 0);
  ctx.lineTo(length * 0.48, 0);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const px = mix(-length * 0.28, length * 0.3, i / 3);
    ctx.beginPath();
    ctx.moveTo(px, -width * 0.17);
    ctx.lineTo(px + length * 0.035, width * 0.17);
    ctx.stroke();
  }
  ctx.restore();

  // Cockpit glazing.
  ctx.save();
  ctx.translate(length * 0.29, 0);
  const glass = ctx.createLinearGradient(0, -width * 0.11, 0, width * 0.11);
  glass.addColorStop(0, "#34414b");
  glass.addColorStop(0.5, "#0d141a");
  glass.addColorStop(1, "#020507");
  ctx.fillStyle = glass;
  ctx.strokeStyle = "rgba(210,225,232,0.35)";
  ctx.lineWidth = Math.max(0.8, length * 0.008);
  ctx.beginPath();
  ctx.moveTo(length * 0.12, 0);
  ctx.lineTo(-length * 0.035, -width * 0.105);
  ctx.lineTo(-length * 0.12, -width * 0.075);
  ctx.lineTo(-length * 0.12, width * 0.075);
  ctx.lineTo(-length * 0.035, width * 0.105);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(0.8, length * 0.007);
  craftOutline(ctx, length, width);
  ctx.stroke();

  ctx.restore();
}

function drawPlasma(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  heat: number,
  seed: number,
  playback: number,
): void {
  if (heat < 0.025) return;

  const width = length * 0.64;
  const intensity = smoothstep(heat);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";

  // Broad plasma sheath wrapping the vehicle.  This is deliberately around
  // the hull, not just a small flame at the tail.
  const sheath = ctx.createLinearGradient(
    -length * 1.45,
    0,
    length * 0.72,
    0,
  );
  sheath.addColorStop(0, "rgba(150,25,5,0)");
  sheath.addColorStop(0.3, `rgba(255,65,10,${0.12 + intensity * 0.22})`);
  sheath.addColorStop(0.67, `rgba(255,150,30,${0.22 + intensity * 0.32})`);
  sheath.addColorStop(0.92, `rgba(255,245,200,${0.32 + intensity * 0.45})`);
  sheath.addColorStop(1, `rgba(235,250,255,${0.24 + intensity * 0.42})`);

  ctx.fillStyle = sheath;
  ctx.shadowColor = `rgba(255,85,16,${0.5 + intensity * 0.4})`;
  ctx.shadowBlur = 10 + intensity * 34;
  ctx.beginPath();
  ctx.moveTo(length * 0.72, 0);
  ctx.bezierCurveTo(
    length * 0.35,
    -width * (0.5 + intensity * 0.25),
    -length * 0.12,
    -width * (0.7 + intensity * 0.35),
    -length * 1.55,
    -width * 0.16,
  );
  ctx.lineTo(-length * 1.95, 0);
  ctx.lineTo(-length * 1.55, width * 0.16);
  ctx.bezierCurveTo(
    -length * 0.12,
    width * (0.7 + intensity * 0.35),
    length * 0.35,
    width * (0.5 + intensity * 0.25),
    length * 0.72,
    0,
  );
  ctx.closePath();
  ctx.fill();

  // White-hot bow shock in front of the nose.
  ctx.strokeStyle = `rgba(245,252,255,${0.18 + intensity * 0.65})`;
  ctx.lineWidth = Math.max(1.2, length * (0.018 + intensity * 0.018));
  ctx.shadowColor = `rgba(255,195,85,${0.45 + intensity * 0.45})`;
  ctx.shadowBlur = 8 + intensity * 22;
  ctx.beginPath();
  ctx.ellipse(
    length * 0.56,
    0,
    length * (0.18 + intensity * 0.12),
    width * (0.42 + intensity * 0.22),
    0,
    -Math.PI * 0.58,
    Math.PI * 0.58,
  );
  ctx.stroke();

  // Hot turbulent wake.
  for (let i = 0; i < 22; i++) {
    const n = hash01(seed, i + Math.floor(playback * 120));
    const n2 = hash01(seed ^ 0xa511e9b3, i * 7 + 3);
    const back = length * (0.55 + n * (1.5 + intensity * 1.7));
    const spread = width * (n2 - 0.5) * (0.25 + intensity * 0.85);
    const rr = Math.max(0.7, length * (0.012 + n * 0.022) * (0.7 + intensity));
    ctx.fillStyle =
      i % 4 === 0
        ? `rgba(255,245,210,${0.12 + intensity * 0.42})`
        : i % 3 === 0
          ? `rgba(255,150,35,${0.1 + intensity * 0.35})`
          : `rgba(220,55,12,${0.08 + intensity * 0.28})`;
    ctx.beginPath();
    ctx.arc(-back, spread, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBurnRemnant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  seed: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < 14; i++) {
    const a = hash01(seed, i);
    const b = hash01(seed ^ 0x91e10da5, i + 11);
    const px = -length * (0.15 + a * 1.9);
    const py = length * (b - 0.5) * 0.45;
    const rr = length * (0.012 + hash01(seed, i + 31) * 0.035);

    const grad = ctx.createRadialGradient(px, py, 0, px, py, rr * 3.2);
    grad.addColorStop(0, "rgba(255,255,235,0.95)");
    grad.addColorStop(0.25, "rgba(255,165,45,0.85)");
    grad.addColorStop(0.62, "rgba(210,45,10,0.42)");
    grad.addColorStop(1, "rgba(110,8,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, rr * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBreakup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  seed: number,
  amount: number,
): void {
  if (amount <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  for (let i = 0; i < 9; i++) {
    const a = hash01(seed, i + 70);
    const b = hash01(seed ^ 0x7f4a7c15, i + 93);
    const dist = length * amount * (0.3 + a * 1.5);
    const px = -dist;
    const py = (b - 0.5) * length * amount * 1.15;
    const s = length * (0.035 + (i % 3) * 0.012);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((b - 0.5) * 1.8);
    ctx.fillStyle = i % 2 === 0 ? "#b9b8b0" : "#252a2d";
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.55);
    ctx.lineTo(-s * 0.35, s * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,105,25,0.55)";
    ctx.lineWidth = Math.max(0.8, s * 0.18);
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, 0);
    ctx.lineTo(-s * (2.1 + a * 2.2), 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function readableHeat(
  physicalHeat: number,
  playback: number,
  outcome: ReentryOutcome | undefined,
): number {
  let heat = physicalHeat;

  // Outcome-specific visual floor only makes an already-determined physical
  // event legible on a phone.  It never changes the simulation or outcome.
  if (outcome === "BURN") {
    heat = Math.max(heat, smoothstep((playback - 0.42) / 0.34));
  } else if (outcome === "BREAK") {
    heat = Math.max(heat, smoothstep((playback - 0.44) / 0.38) * 0.78);
  } else if (outcome === "EARTH_REACHED") {
    const rise = smoothstep((playback - 0.42) / 0.25);
    const fall = 1 - smoothstep((playback - 0.79) / 0.18);
    heat = Math.max(heat, rise * fall * 0.68);
  } else if (outcome === "SKIP") {
    const rise = smoothstep((playback - 0.42) / 0.2);
    const fall = 1 - smoothstep((playback - 0.68) / 0.2);
    heat = Math.max(heat, rise * fall * 0.46);
  }

  return clamp01(heat);
}

export function ReentryPresentationCanvas({
  phase,
  result,
  flightProgress,
  angleNorm,
  variant,
}: {
  phase: ReentryPhase;
  result: ReentryResult | null;
  flightProgress: number;
  angleNorm: number;
  variant: ReentryArtVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earthRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let live = true;
    void loadImage(EARTH_SOURCE)
      .then((img) => {
        if (live) earthRef.current = img;
      })
      .catch(() => {
        if (live) earthRef.current = null;
      });

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const w = Math.max(1, parent.clientWidth);
      const h = Math.max(1, parent.clientHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      const pw = Math.floor(w * dpr);
      const ph = Math.floor(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      const idle = phase === "power" || phase === "angle";
      const playback =
        phase === "result" ? 1 : phase === "flight" ? flightProgress : 0;
      const outcome = result?.outcome;

      const frame =
        result && (phase === "flight" || phase === "result")
          ? sampleFrame(
              result.frames,
              playbackToFrameProgress(playback, outcome ?? "BURN"),
            )
          : restFrame(result);

      const rawHeat = idle
        ? 0
        : presentationHeatGlow(
            frame.heatFluxWm2,
            playback,
            outcome ?? "BURN",
          );
      const heat = idle ? 0 : readableHeat(rawHeat, playback, outcome);

      drawStars(ctx, w, h, playback, !idle);

      const earth = earthView(playback, outcome, idle, w, h);
      drawEarth(ctx, earthRef.current, earth, heat);

      const pose = craftPose(
        playback,
        outcome,
        angleNorm,
        idle,
        w,
        h,
      );

      const near = idle ? 0 : smoothstep((playback - 0.34) / 0.48);
      const baseCraft = Math.min(w, h) * (variant === "preview" ? 0.09 : 0.105);
      const craftLength = baseCraft * mix(0.82, 1.22, near);

      let craftAlpha = 1;
      if (outcome === "BURN" && playback > 0.76) {
        craftAlpha = 1 - smoothstep((playback - 0.76) / 0.18);
      } else if (outcome === "BREAK" && playback > 0.72) {
        craftAlpha = 1 - smoothstep((playback - 0.72) / 0.14);
      }

      // Plasma first, hull second: the vehicle stays readable inside the fire.
      if (!idle) {
        drawPlasma(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          heat,
          result?.seed ?? 1,
          playback,
        );
      }

      if (craftAlpha > 0.015) {
        drawCraft(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          craftAlpha,
          heat,
        );
      }

      if (outcome === "BREAK" && playback > 0.67) {
        drawBreakup(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          result?.seed ?? 1,
          smoothstep((playback - 0.67) / 0.28),
        );
      }

      if (outcome === "BURN" && playback > 0.73) {
        const amount = smoothstep((playback - 0.73) / 0.22);
        ctx.save();
        ctx.globalAlpha = 0.35 + amount * 0.65;
        drawBurnRemnant(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          result?.seed ?? 1,
        );
        ctx.restore();
      }

      if (phase === "angle") {
        ctx.save();
        ctx.translate(pose.x, pose.y);
        ctx.rotate(pose.angle);
        ctx.strokeStyle = "rgba(205,220,232,0.42)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(craftLength * 0.7, 0);
        ctx.lineTo(craftLength * 1.22, 0);
        ctx.stroke();
        ctx.restore();
      }

      // A very subtle atmospheric wash during the hottest part of entry.
      if (!idle && heat > 0.42) {
        const wash = ctx.createLinearGradient(0, h * 0.35, 0, h);
        wash.addColorStop(0, "rgba(255,75,10,0)");
        wash.addColorStop(0.72, `rgba(255,80,14,${(heat - 0.42) * 0.035})`);
        wash.addColorStop(1, "rgba(255,70,10,0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);
      }
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [angleNorm, flightProgress, phase, result, variant]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
