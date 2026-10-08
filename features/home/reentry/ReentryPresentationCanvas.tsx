"use client";

import { useEffect, useRef } from "react";
import {
  playbackToFrameProgress,
  presentationHeatGlow,
} from "./reentryPlayback";
import type { ReentryArtVariant } from "./reentryArtPresentation";
import type { ReentryOutcome, ReentryPhase, ReentryResult } from "./reentryTypes";
import { restFrame, sampleFrame } from "./reentryVisual";
import {
  finishReentryAudio,
  setReentryAudioFlight,
  stopReentryAudio,
} from "./reentryAudio";

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

function cubic(a: number, b: number, c: number, d: number, t: number): number {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
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

interface Point {
  x: number;
  y: number;
}

interface EarthView {
  x: number;
  y: number;
  r: number;
  horizonMix: number;
  alpha: number;
}

function orbitalEarth(w: number, h: number): EarthView {
  const r = w * 0.052;
  return {
    x: w * 0.105,
    y: h - r - Math.min(w, h) * 0.043,
    r,
    horizonMix: 0,
    alpha: 1,
  };
}

/**
 * Camera design:
 * 0.00–0.52: distant full globe.
 * 0.52–0.82: continuous push toward the limb.
 * 0.82–1.00: huge curved horizon / ocean / cloud view.
 * BURN result: cut back to quiet orbital Earth after the vehicle is gone.
 */
function earthView(
  playback: number,
  outcome: ReentryOutcome | undefined,
  idle: boolean,
  phase: ReentryPhase,
  w: number,
  h: number,
): EarthView {
  if (idle) return orbitalEarth(w, h);

  if (phase === "result" && outcome === "BURN") {
    return orbitalEarth(w, h);
  }

  if (outcome === "SKIP" && playback > 0.72) {
    const retreat = smoothstep((playback - 0.72) / 0.28);
    const nearR = w * 0.19;
    const far = orbitalEarth(w, h);
    return {
      x: mix(w * 0.16, far.x, retreat),
      y: mix(h * 0.72, far.y, retreat),
      r: mix(nearR, far.r * 0.9, retreat),
      horizonMix: mix(0.15, 0, retreat),
      alpha: 1,
    };
  }

  const push = smoothstep((playback - 0.10) / 0.62);
  const horizon = smoothstep((playback - 0.54) / 0.30);

  const r = mix(w * 0.052, w * 1.38, horizon) + w * 0.11 * push;
  const x = mix(w * 0.105, w * 0.27, horizon);
  const y = mix(
    h - w * 0.052 - Math.min(w, h) * 0.043,
    h + r * 0.43,
    horizon,
  );

  return {
    x,
    y,
    r,
    horizonMix: horizon,
    alpha: 1,
  };
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  playback: number,
  moving: boolean,
  horizonMix: number,
): void {
  const streak = moving ? smoothstep((playback - 0.10) / 0.42) : 0;
  const fade = 1 - horizonMix * 0.72;

  ctx.save();
  ctx.globalAlpha = fade;

  for (let i = 0; i < 54; i++) {
    const x = (((i * 89 + 17) % 101) / 101) * w;
    const y = (((i * 47 + 29) % 103) / 103) * h;
    const alpha = 0.10 + (i % 6) * 0.038;
    const size = i % 11 === 0 ? 1.35 : 0.75;

    ctx.strokeStyle = `rgba(228,237,245,${alpha})`;
    ctx.fillStyle = `rgba(228,237,245,${alpha})`;

    if (streak > 0.03 && i % 3 === 0) {
      const len = (3 + (i % 6) * 2.2) * streak;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * 0.58, y - len);
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, size, size);
    }
  }

  ctx.restore();
}

function drawEarthTexture(
  ctx: CanvasRenderingContext2D,
  earth: HTMLImageElement | null,
  x: number,
  y: number,
  r: number,
): void {
  if (earth && earth.naturalWidth > 0) {
    const size = Math.min(earth.naturalWidth, earth.naturalHeight);
    const sx = earth.naturalWidth * 0.165;
    const sy = earth.naturalHeight * 0.165;
    const sw = size * 0.67;
    const sh = size * 0.67;

    ctx.drawImage(
      earth,
      sx,
      sy,
      sw,
      sh,
      x - r,
      y - r,
      r * 2,
      r * 2,
    );
  } else {
    const g = ctx.createRadialGradient(
      x - r * 0.28,
      y - r * 0.32,
      r * 0.08,
      x,
      y,
      r,
    );
    g.addColorStop(0, "#6b9aba");
    g.addColorStop(0.5, "#214f70");
    g.addColorStop(1, "#06111d");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function drawEarth(
  ctx: CanvasRenderingContext2D,
  earth: HTMLImageElement | null,
  view: EarthView,
  heat: number,
  w: number,
  h: number,
): void {
  const { x, y, r, horizonMix, alpha } = view;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Atmospheric limb: thin while distant, deep blue band when the camera
  // reaches the horizon.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(
    x,
    y,
    r * (0.965 - horizonMix * 0.015),
    x,
    y,
    r * (1.035 + horizonMix * 0.018),
  );
  halo.addColorStop(0, "rgba(25,100,200,0)");
  halo.addColorStop(
    0.46,
    `rgba(70,165,255,${0.12 + horizonMix * 0.15 + heat * 0.04})`,
  );
  halo.addColorStop(
    0.68,
    `rgba(175,225,255,${0.25 + horizonMix * 0.25 + heat * 0.06})`,
  );
  halo.addColorStop(
    0.82,
    `rgba(80,155,255,${0.12 + horizonMix * 0.16})`,
  );
  halo.addColorStop(1, "rgba(30,85,170,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * (1.055 + horizonMix * 0.015), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  drawEarthTexture(ctx, earth, x, y, r);

  // Darken the far side and add depth.
  const shade = ctx.createLinearGradient(
    x - r * 0.85,
    y - r * 0.75,
    x + r * 0.9,
    y + r * 0.8,
  );
  shade.addColorStop(0, "rgba(0,0,0,0.00)");
  shade.addColorStop(0.58, "rgba(0,0,0,0.03)");
  shade.addColorStop(1, "rgba(0,0,0,0.36)");
  ctx.fillStyle = shade;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  if (horizonMix > 0.12) {
    // Fine cloud bands and ocean shimmer make the late entry read as
    // atmosphere/ocean rather than a giant flat globe.
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    for (let i = 0; i < 10; i++) {
      const yy =
        h * (0.58 + i * 0.045) +
        Math.sin(i * 2.1) * h * 0.012;
      ctx.strokeStyle = `rgba(235,245,250,${
        (0.02 + (i % 4) * 0.012) * horizonMix
      })`;
      ctx.lineWidth = 3 + (i % 3) * 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.08, yy);
      ctx.bezierCurveTo(
        w * 0.24,
        yy - h * 0.03,
        w * 0.62,
        yy + h * 0.02,
        w * 1.08,
        yy - h * 0.015,
      );
      ctx.stroke();
    }

    // Small, subdued island silhouettes: visual scale cue, not a real map.
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(31,58,49,${0.20 * horizonMix})`;
    for (let i = 0; i < 5; i++) {
      const ix = w * (0.13 + i * 0.17);
      const iy = h * (0.76 + (i % 2) * 0.06);
      const s = w * (0.018 + (i % 3) * 0.005);
      ctx.beginPath();
      ctx.ellipse(ix, iy, s * 1.8, s * 0.58, -0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = `rgba(180,225,255,${0.34 + horizonMix * 0.24})`;
  ctx.lineWidth = Math.max(1, r * (0.005 + horizonMix * 0.002));
  ctx.shadowColor = `rgba(80,170,255,${0.42 + horizonMix * 0.22})`;
  ctx.shadowBlur = Math.max(5, Math.min(26, r * 0.025));
  ctx.beginPath();
  ctx.arc(x, y, r * 1.002, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

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
    -width * 0.20,
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
    width * 0.20,
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

  // Dark heat shield offset gives thickness.
  ctx.save();
  ctx.translate(-length * 0.025, length * 0.035);
  craftOutline(ctx, length, width);
  ctx.fillStyle = "#10161b";
  ctx.shadowColor =
    heat > 0.15
      ? `rgba(255,82,18,${0.22 + heat * 0.40})`
      : "rgba(0,0,0,0.72)";
  ctx.shadowBlur = heat > 0.15 ? 10 + heat * 22 : 7;
  ctx.fill();
  ctx.restore();

  craftOutline(ctx, length, width);
  const hull = ctx.createLinearGradient(
    -length * 0.50,
    -width * 0.22,
    length * 0.58,
    width * 0.16,
  );
  hull.addColorStop(0, "#757c81");
  hull.addColorStop(0.24, "#d8d9d6");
  hull.addColorStop(0.57, "#f1efe8");
  hull.addColorStop(0.82, "#c9ccca");
  hull.addColorStop(1, "#a7adb0");
  ctx.fillStyle = hull;
  ctx.fill();

  ctx.save();
  craftOutline(ctx, length, width);
  ctx.clip();

  const underside = ctx.createLinearGradient(
    0,
    -width * 0.42,
    0,
    width * 0.52,
  );
  underside.addColorStop(0.43, "rgba(20,24,28,0)");
  underside.addColorStop(0.64, "rgba(10,14,18,0.24)");
  underside.addColorStop(1, "rgba(3,5,7,0.86)");
  ctx.fillStyle = underside;
  ctx.fillRect(-length, -width, length * 2, width * 2);

  ctx.strokeStyle = "rgba(35,45,52,0.20)";
  ctx.lineWidth = Math.max(0.7, length * 0.008);
  ctx.beginPath();
  ctx.moveTo(-length * 0.40, 0);
  ctx.lineTo(length * 0.48, 0);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const px = mix(-length * 0.28, length * 0.30, i / 3);
    ctx.beginPath();
    ctx.moveTo(px, -width * 0.17);
    ctx.lineTo(px + length * 0.035, width * 0.17);
    ctx.stroke();
  }
  ctx.restore();

  // Cockpit.
  ctx.save();
  ctx.translate(length * 0.29, 0);
  const glass = ctx.createLinearGradient(0, -width * 0.11, 0, width * 0.11);
  glass.addColorStop(0, "#34424c");
  glass.addColorStop(0.52, "#0c141a");
  glass.addColorStop(1, "#020507");
  ctx.fillStyle = glass;
  ctx.strokeStyle = "rgba(210,225,232,0.34)";
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

  ctx.strokeStyle = "rgba(255,255,255,0.48)";
  ctx.lineWidth = Math.max(0.8, length * 0.007);
  craftOutline(ctx, length, width);
  ctx.stroke();

  ctx.restore();
}

function drawFlowLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  heat: number,
  playback: number,
): void {
  if (heat < 0.10) return;

  const intensity = smoothstep((heat - 0.10) / 0.90);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (let i = 0; i < 9; i++) {
    const side = (i - 4) / 4;
    const phase = playback * 12 + i * 0.7;
    const wobble = Math.sin(phase) * length * 0.035;
    const y0 = side * length * (0.12 + intensity * 0.16);
    const back = length * (1.4 + intensity * 2.3 + (i % 3) * 0.16);

    ctx.strokeStyle =
      i % 3 === 0
        ? `rgba(245,252,255,${0.07 + intensity * 0.15})`
        : i % 3 === 1
          ? `rgba(255,210,120,${0.05 + intensity * 0.12})`
          : `rgba(255,120,35,${0.04 + intensity * 0.10})`;

    ctx.lineWidth = 0.7 + intensity * (i % 2 ? 1.2 : 0.8);

    ctx.beginPath();
    ctx.moveTo(length * 0.62, y0 * 0.35);
    ctx.bezierCurveTo(
      length * 0.16,
      y0 + wobble,
      -length * 0.62,
      y0 * 1.9 - wobble,
      -back,
      y0 * 2.5,
    );
    ctx.stroke();
  }

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
  if (heat < 0.035) return;

  const width = length * 0.64;
  const intensity = smoothstep(heat);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";

  /*
   * Detached hypersonic bow-shock dome.
   * It is a filled rounded volume, not a C-shaped stroke.
   * The craft is drawn AFTER this effect so the hull stays readable.
   */
  const domeX = length * (0.60 + intensity * 0.045);
  const domeRx = length * (0.21 + intensity * 0.21);
  const domeRy = width * (0.50 + intensity * 0.40);

  ctx.save();
  ctx.translate(domeX, 0);
  ctx.scale(1, domeRy / domeRx);

  const outer = ctx.createRadialGradient(
    -domeRx * 0.18,
    0,
    domeRx * 0.04,
    0,
    0,
    domeRx,
  );
  outer.addColorStop(
    0,
    `rgba(248,253,255,${0.10 + intensity * 0.44})`,
  );
  outer.addColorStop(
    0.24,
    `rgba(255,250,220,${0.12 + intensity * 0.40})`,
  );
  outer.addColorStop(
    0.49,
    `rgba(255,191,76,${0.10 + intensity * 0.35})`,
  );
  outer.addColorStop(
    0.73,
    `rgba(255,87,18,${0.08 + intensity * 0.28})`,
  );
  outer.addColorStop(
    0.90,
    `rgba(180,28,5,${0.04 + intensity * 0.17})`,
  );
  outer.addColorStop(1, "rgba(100,5,0,0)");

  ctx.fillStyle = outer;
  ctx.shadowColor = `rgba(255,94,18,${0.30 + intensity * 0.48})`;
  ctx.shadowBlur = 12 + intensity * 34;
  ctx.beginPath();
  ctx.arc(0, 0, domeRx, 0, Math.PI * 2);
  ctx.fill();

  const core = ctx.createRadialGradient(
    -domeRx * 0.24,
    0,
    0,
    -domeRx * 0.08,
    0,
    domeRx * 0.58,
  );
  core.addColorStop(
    0,
    `rgba(248,254,255,${0.12 + intensity * 0.52})`,
  );
  core.addColorStop(
    0.31,
    `rgba(255,251,230,${0.12 + intensity * 0.43})`,
  );
  core.addColorStop(
    0.70,
    `rgba(255,153,42,${0.06 + intensity * 0.24})`,
  );
  core.addColorStop(1, "rgba(255,70,12,0)");

  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(-domeRx * 0.08, 0, domeRx * 0.66, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Plasma sheath.
  const sheath = ctx.createLinearGradient(
    -length * 1.85,
    0,
    length * 0.68,
    0,
  );
  sheath.addColorStop(0, "rgba(130,16,4,0)");
  sheath.addColorStop(
    0.28,
    `rgba(210,39,8,${0.05 + intensity * 0.15})`,
  );
  sheath.addColorStop(
    0.53,
    `rgba(255,83,14,${0.08 + intensity * 0.23})`,
  );
  sheath.addColorStop(
    0.76,
    `rgba(255,177,55,${0.10 + intensity * 0.29})`,
  );
  sheath.addColorStop(
    0.93,
    `rgba(255,245,208,${0.10 + intensity * 0.34})`,
  );
  sheath.addColorStop(1, "rgba(248,253,255,0)");

  ctx.fillStyle = sheath;
  ctx.shadowColor = `rgba(255,73,12,${0.24 + intensity * 0.42})`;
  ctx.shadowBlur = 8 + intensity * 28;
  ctx.beginPath();
  ctx.moveTo(length * 0.62, 0);
  ctx.bezierCurveTo(
    length * 0.24,
    -width * (0.48 + intensity * 0.20),
    -length * 0.28,
    -width * (0.70 + intensity * 0.35),
    -length * 1.55,
    -width * 0.18,
  );
  ctx.lineTo(-length * 2.20, 0);
  ctx.lineTo(-length * 1.55, width * 0.18);
  ctx.bezierCurveTo(
    -length * 0.28,
    width * (0.70 + intensity * 0.35),
    length * 0.24,
    width * (0.48 + intensity * 0.20),
    length * 0.62,
    0,
  );
  ctx.closePath();
  ctx.fill();

  // Turbulent hot wake.
  for (let i = 0; i < 38; i++) {
    const n = hash01(seed, i + Math.floor(playback * 110));
    const n2 = hash01(seed ^ 0xa511e9b3, i * 7 + 3);
    const n3 = hash01(seed ^ 0x43f14a1d, i * 13 + 17);

    const back = length * (0.52 + n * (1.8 + intensity * 2.2));
    const spread =
      width * (n2 - 0.5) * (0.18 + intensity * 1.0);
    const rr = Math.max(
      0.7,
      length * (0.009 + n3 * 0.026) * (0.75 + intensity),
    );

    const hot = 1 - clamp01(back / (length * 3.5));
    const a =
      (0.045 + intensity * 0.30) *
      (0.45 + hot * 0.55);

    ctx.fillStyle =
      hot > 0.72
        ? `rgba(255,250,225,${a})`
        : hot > 0.44
          ? `rgba(255,177,54,${a})`
          : `rgba(215,47,10,${a * 0.76})`;

    ctx.beginPath();
    ctx.arc(-back, spread, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBurnDisintegration(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  seed: number,
  amount: number,
): void {
  if (amount <= 0 || amount >= 1) return;

  const burst = smoothstep(amount / 0.38);
  const fade = 1 - smoothstep((amount - 0.56) / 0.44);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fade;

  // Final white-hot thermal flash.
  if (amount < 0.50) {
    const flashR = length * (0.20 + burst * 0.58);
    const flash = ctx.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      flashR,
    );
    flash.addColorStop(
      0,
      `rgba(255,255,250,${0.88 * (1 - amount * 0.55)})`,
    );
    flash.addColorStop(0.22, "rgba(255,239,190,0.78)");
    flash.addColorStop(0.56, "rgba(255,116,28,0.46)");
    flash.addColorStop(1, "rgba(170,22,4,0)");

    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(0, 0, flashR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Incandescent fragments in all directions. They extinguish completely.
  for (let i = 0; i < 22; i++) {
    const a = hash01(seed ^ 0x91e10da5, i + 11);
    const b = hash01(seed ^ 0xc2b2ae35, i + 41);
    const c = hash01(seed ^ 0x27d4eb2f, i + 79);

    const theta = a * Math.PI * 2 + (i % 2 ? 0.16 : -0.16);
    const dist = length * burst * (0.15 + b * 1.95);
    const px = Math.cos(theta) * dist - length * burst * 0.18;
    const py = Math.sin(theta) * dist * 0.78;
    const rr =
      length * (0.010 + c * 0.036) * (1 - amount * 0.36);

    const glow = ctx.createRadialGradient(
      px,
      py,
      0,
      px,
      py,
      rr * 3.2,
    );
    glow.addColorStop(0, "rgba(255,255,232,0.96)");
    glow.addColorStop(0.24, "rgba(255,177,54,0.86)");
    glow.addColorStop(0.62, "rgba(225,54,10,0.46)");
    glow.addColorStop(1, "rgba(100,6,0,0)");

    ctx.fillStyle = glow;
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

  for (let i = 0; i < 11; i++) {
    const a = hash01(seed, i + 70);
    const b = hash01(seed ^ 0x7f4a7c15, i + 93);
    const dist = length * amount * (0.3 + a * 1.7);
    const px = -dist;
    const py = (b - 0.5) * length * amount * 1.35;
    const s = length * (0.032 + (i % 3) * 0.013);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((b - 0.5) * 1.9);
    ctx.fillStyle = i % 2 === 0 ? "#b9b8b0" : "#252a2d";
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.55);
    ctx.lineTo(-s * 0.35, s * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,108,25,0.54)";
    ctx.lineWidth = Math.max(0.8, s * 0.18);
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, 0);
    ctx.lineTo(-s * (2.2 + a * 2.4), 0);
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

  // Delay visible heating so the early orbit remains calm.
  const gate = smoothstep((playback - 0.49) / 0.16);

  if (outcome === "BURN") {
    heat = Math.max(
      heat * gate,
      smoothstep((playback - 0.56) / 0.27),
    );
  } else if (outcome === "BREAK") {
    heat = Math.max(
      heat * gate,
      smoothstep((playback - 0.57) / 0.29) * 0.82,
    );
  } else if (outcome === "EARTH_REACHED") {
    const rise = smoothstep((playback - 0.55) / 0.23);
    const fall = 1 - smoothstep((playback - 0.86) / 0.12);
    heat = Math.max(heat * gate, rise * fall * 0.72);
  } else if (outcome === "SKIP") {
    const rise = smoothstep((playback - 0.54) / 0.20);
    const fall = 1 - smoothstep((playback - 0.72) / 0.18);
    heat = Math.max(heat * gate, rise * fall * 0.50);
  }

  return clamp01(heat);
}

function pathPoint(
  playback: number,
  outcome: ReentryOutcome | undefined,
  angleNorm: number,
  w: number,
  h: number,
): Point {
  const start = { x: w * 0.80, y: h * 0.15 };
  const steer = (angleNorm - 0.5) * 2;

  if (playback <= 0.58) {
    const t = smoothstep(playback / 0.58);
    return {
      x: cubic(
        start.x,
        w * (0.80 - steer * 0.035),
        w * (0.70 - steer * 0.055),
        w * (0.58 - steer * 0.035),
        t,
      ),
      y: cubic(
        start.y,
        h * (0.18 + steer * 0.025),
        h * (0.28 + steer * 0.085),
        h * (0.39 + steer * 0.10),
        t,
      ),
    };
  }

  const t = smoothstep((playback - 0.58) / 0.42);
  const ex = w * (0.58 - steer * 0.035);
  const ey = h * (0.39 + steer * 0.10);

  if (outcome === "SKIP") {
    return {
      x: cubic(ex, w * 0.48, w * 0.63, w * 0.84, t),
      y: cubic(
        ey,
        h * (0.48 - steer * 0.06),
        h * 0.33,
        h * 0.20,
        t,
      ),
    };
  }

  if (outcome === "EARTH_REACHED") {
    return {
      x: cubic(ex, w * 0.53, w * 0.47, w * 0.40, t),
      y: cubic(
        ey,
        h * (0.49 + steer * 0.05),
        h * 0.61,
        h * 0.76,
        t,
      ),
    };
  }

  return {
    x: cubic(ex, w * 0.54, w * 0.50, w * 0.46, t),
    y: cubic(
      ey,
      h * (0.48 + steer * 0.04),
      h * 0.56,
      h * 0.62,
      t,
    ),
  };
}

function craftPose(
  playback: number,
  outcome: ReentryOutcome | undefined,
  angleNorm: number,
  idle: boolean,
  heat: number,
  seed: number,
  w: number,
  h: number,
): { x: number; y: number; angle: number } {
  const p = pathPoint(playback, outcome, angleNorm, w, h);
  const q = pathPoint(
    Math.min(1, playback + 0.008),
    outcome,
    angleNorm,
    w,
    h,
  );
  const pathAngle = Math.atan2(q.y - p.y, q.x - p.x);

  // Large visual steering range, while physics remains the existing
  // shallow↔steep entry-angle mapping.
  const steerAngle = (angleNorm - 0.5) * 1.55;

  const stress =
    idle
      ? 0
      : smoothstep((heat - 0.28) / 0.72) *
        smoothstep((playback - 0.55) / 0.30);

  const burnBoost =
    outcome === "BURN"
      ? smoothstep((playback - 0.68) / 0.18)
      : 0;

  const shake = stress * (1 + burnBoost * 1.7);
  const jitterX =
    Math.sin(playback * 132 + seed * 0.00001) *
    Math.min(w, h) *
    0.006 *
    shake;
  const jitterY =
    Math.sin(playback * 177 + seed * 0.000013 + 1.7) *
    Math.min(w, h) *
    0.007 *
    shake;
  const jitterA =
    Math.sin(playback * 155 + seed * 0.000009 + 0.4) *
    0.055 *
    shake;

  return {
    x: p.x + jitterX,
    y: p.y + jitterY,
    angle: pathAngle + steerAngle * (idle ? 0.76 : 0.42) + jitterA,
  };
}

function drawDirectionRing(
  ctx: CanvasRenderingContext2D,
  pose: { x: number; y: number; angle: number },
  craftLength: number,
): void {
  ctx.save();
  ctx.translate(pose.x, pose.y);

  const ringR = craftLength * 1.02;

  ctx.strokeStyle = "rgba(205,220,232,0.30)";
  ctx.lineWidth = 1.15;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(pose.angle);

  ctx.strokeStyle = "rgba(238,246,250,0.88)";
  ctx.fillStyle = "rgba(238,246,250,0.88)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(craftLength * 0.70, 0);
  ctx.lineTo(craftLength * 1.48, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(craftLength * 1.48, 0);
  ctx.lineTo(craftLength * 1.25, -craftLength * 0.12);
  ctx.lineTo(craftLength * 1.25, craftLength * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawResultLabel(
  ctx: CanvasRenderingContext2D,
  outcome: ReentryOutcome,
  w: number,
  h: number,
): void {
  const label = outcome === "EARTH_REACHED" ? "EARTH REACHED" : outcome;

  // Always use the black-space side, not the Earth.
  const x = w * 0.70;
  const y = h * 0.37;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(246,248,250,0.96)";
  ctx.shadowColor = "rgba(0,0,0,0.88)";
  ctx.shadowBlur = 16;

  const size = Math.max(28, Math.min(64, w * 0.065));
  ctx.font = `600 ${size}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(label, x, y);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(190,202,212,0.60)";
  ctx.font = `500 ${Math.max(10, size * 0.22)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("STAGE 1", x, y + size * 0.72);
  ctx.restore();
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
  const resultSoundRef = useRef<string | null>(null);

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
    if (variant !== "stage") return;

    if (phase === "power") {
      resultSoundRef.current = null;
      stopReentryAudio();
      return;
    }

    if (phase === "result" && result) {
      const key = `${result.seed}:${result.outcome}`;
      if (resultSoundRef.current !== key) {
        resultSoundRef.current = key;
        finishReentryAudio(result.outcome);
      }
    }
  }, [phase, result, variant]);

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
        phase === "result"
          ? 1
          : phase === "flight"
            ? flightProgress
            : 0;
      const outcome = result?.outcome;

      const frame =
        result && (phase === "flight" || phase === "result")
          ? sampleFrame(
              result.frames,
              playbackToFrameProgress(
                playback,
                outcome ?? "BURN",
              ),
            )
          : restFrame(result);

      const rawHeat =
        idle
          ? 0
          : presentationHeatGlow(
              frame.heatFluxWm2,
              playback,
              outcome ?? "BURN",
            );

      const heat =
        idle ? 0 : readableHeat(rawHeat, playback, outcome);

      if (variant === "stage" && phase === "flight") {
        setReentryAudioFlight(playback, heat, outcome);
      }

      const earth = earthView(
        playback,
        outcome,
        idle,
        phase,
        w,
        h,
      );

      drawStars(
        ctx,
        w,
        h,
        playback,
        !idle,
        earth.horizonMix,
      );

      drawEarth(
        ctx,
        earthRef.current,
        earth,
        heat,
        w,
        h,
      );

      const pose = craftPose(
        playback,
        outcome,
        angleNorm,
        idle,
        heat,
        result?.seed ?? 1,
        w,
        h,
      );

      const approachScale =
        idle ? 0 : smoothstep((playback - 0.20) / 0.66);
      const baseCraft =
        Math.min(w, h) *
        (variant === "preview" ? 0.088 : 0.102);
      const craftLength =
        baseCraft * mix(0.62, 1.62, approachScale);

      let craftAlpha = 1;

      if (outcome === "BURN" && playback > 0.74) {
        craftAlpha =
          1 - smoothstep((playback - 0.74) / 0.12);
      } else if (outcome === "BREAK" && playback > 0.72) {
        craftAlpha =
          1 - smoothstep((playback - 0.72) / 0.14);
      }

      const burnGone =
        outcome === "BURN" &&
        (phase === "result" || playback >= 0.965);

      if (!idle && !burnGone) {
        drawFlowLines(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          heat,
          playback,
        );

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

      if (craftAlpha > 0.015 && !burnGone) {
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

      if (
        outcome === "BREAK" &&
        playback > 0.67
      ) {
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

      if (
        outcome === "BURN" &&
        playback > 0.71 &&
        playback < 0.965
      ) {
        drawBurnDisintegration(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          result?.seed ?? 1,
          smoothstep((playback - 0.71) / 0.255),
        );
      }

      if (phase === "angle") {
        drawDirectionRing(ctx, pose, craftLength);
      }

      if (
        phase === "result" &&
        outcome &&
        variant === "stage"
      ) {
        drawResultLabel(ctx, outcome, w, h);
      }
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [
    angleNorm,
    flightProgress,
    phase,
    result,
    variant,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}

