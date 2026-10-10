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
  craftPose,
  launchAnchorPx,
  projectPhysicsFrame,
} from "./reentryCraftProjection";
import {
  reentryStageMix,
  visualAtmosphereGate,
} from "./reentryCinematicStages";
import {
  ATMOSPHERE_HANDOFF_ALTITUDE_M,
  canvasHeadingFromWorld,
  directionNormToScreenHeadingRad,
  launchSpaceApproach,
  sampleSpacePoint,
  type SpaceApproachResult,
  type SpaceState,
} from "./reentrySpaceApproach";
import { mapLaunchToInput } from "./reentryLaunchInput";
import {
  cinematicEarthView,
  launchEarthView,
} from "./reentryEarthCamera";
import {
  ATMOSPHERE_SURVIVE_S,
  SPACE_INBOUND_DURATION_MS,
  destructionAmountFromEntryS,
  successLandingT,
} from "./reentryStageTimeline";
import {
  atmosphereThicknessPx,
  clampHeadingJump,
  closestApproachIndex,
  elapsedSincePlaybackS,
  gravityPathScalePx,
  gravityScreenPosition,
  hazeEntryTarget,
  headingHazeEntryTarget,
  inboundGravityScreenPose,
  missPlaybackToPathT,
  signedDistanceToAtmospherePx,
  spaceTravelT,
  tangentAngleFromPoints,
} from "./reentryVisualCausality";
import {
  finishReentryAudio,
  setReentryAudioFlight,
  startReentryAmbience,
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

function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
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
  altitudeM: number,
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

  // Keep the globe distant until the vehicle is actually near the atmosphere.
  // No automatic "camera attraction" when the craft flies away.
  const atmosphereProximity = smoothstep((125_000 - altitudeM) / 78_000);
  const lowAltitude = smoothstep((92_000 - altitudeM) / 62_000);

  if (outcome === "SKIP" && phase === "result") {
    const far = orbitalEarth(w, h);
    return {
      ...far,
      r: far.r * 0.92,
    };
  }

  const r =
    w * 0.052 +
    w * 0.17 * atmosphereProximity +
    w * 1.02 * lowAltitude;
  const x = mix(w * 0.105, w * 0.26, lowAltitude);
  const y = mix(
    h - w * 0.052 - Math.min(w, h) * 0.043,
    h + r * 0.43,
    lowAltitude,
  );

  return {
    x,
    y,
    r,
    horizonMix: lowAltitude,
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
  stars = 1,
): void {
  if (stars <= 0.001) return;

  void playback;
  void moving;

  const fade =
    (1 - horizonMix * 0.90) * stars;

  const clockS =
    typeof performance !== "undefined"
      ? performance.now() / 1000
      : 0;

  ctx.save();
  ctx.globalAlpha = fade;

  for (let i = 0; i < 96; i++) {
    const rx = hash01(0x51a2, i * 7 + 1);
    const ry = hash01(0x71c9, i * 11 + 3);
    const rb = hash01(0x91ef, i * 13 + 5);
    const phase =
      hash01(0xa217, i * 17 + 9) *
      Math.PI *
      2;

    const x = rx * w;
    const y = ry * h;

    const bright = i % 17 === 0;
    const cool = i % 23 === 0;
    const warm = i % 29 === 0;

    const twinkleAmount =
      bright
        ? 0.24
        : cool || warm
          ? 0.15
          : 0.045;

    const twinkle =
      0.88 +
      Math.sin(
        clockS * (0.35 + rb * 0.50) +
          phase,
      ) *
        twinkleAmount;

    const alpha =
      (
        bright
          ? 0.76
          : cool || warm
            ? 0.58
            : 0.16 + rb * 0.18
      ) *
      twinkle;

    const radius =
      bright
        ? 1.05 + rb * 0.72
        : cool || warm
          ? 0.72 + rb * 0.42
          : 0.34 + rb * 0.38;

    let color =
      `rgba(232,240,248,${alpha})`;

    if (cool) {
      color =
        `rgba(166,205,255,${alpha})`;
    } else if (warm) {
      color =
        `rgba(255,186,142,${alpha * 0.90})`;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    if (bright || cool || warm) {
      const flare =
        bright
          ? 3.6 + rb * 2.6
          : 2.0 + rb * 1.8;

      ctx.strokeStyle =
        cool
          ? `rgba(174,215,255,${alpha * 0.30})`
          : warm
            ? `rgba(255,200,166,${alpha * 0.24})`
            : `rgba(228,240,250,${alpha * 0.28})`;

      ctx.lineWidth = 0.50;
      ctx.beginPath();
      ctx.moveTo(x - flare, y);
      ctx.lineTo(x + flare, y);
      ctx.moveTo(x, y - flare);
      ctx.lineTo(x, y + flare);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawAtmosphericHorizon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  atmosphereMix: number,
  blueLimb: number,
): void {
  if (atmosphereMix <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = atmosphereMix;

  const sky = ctx.createLinearGradient(
    0,
    0,
    0,
    h,
  );

  sky.addColorStop(
    0,
    `rgba(0, 3, 10, ${0.98})`,
  );
  sky.addColorStop(
    0.42,
    `rgba(3, 18, 43, ${0.94})`,
  );
  sky.addColorStop(
    0.72,
    `rgba(18, 74, 132, ${0.88 * blueLimb})`,
  );
  sky.addColorStop(
    1,
    `rgba(102, 170, 220, ${0.72 * blueLimb})`,
  );

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const horizonY =
    h * (0.78 - atmosphereMix * 0.16);

  const ocean = ctx.createLinearGradient(
    0,
    horizonY,
    0,
    h,
  );

  ocean.addColorStop(
    0,
    "rgba(48,105,150,0.82)",
  );
  ocean.addColorStop(
    0.32,
    "rgba(20,65,105,0.94)",
  );
  ocean.addColorStop(
    1,
    "rgba(4,20,38,1)",
  );

  ctx.fillStyle = ocean;
  ctx.fillRect(
    0,
    horizonY,
    w,
    h - horizonY,
  );

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const limb = ctx.createLinearGradient(
    0,
    horizonY - h * 0.075,
    0,
    horizonY + h * 0.018,
  );

  limb.addColorStop(
    0,
    "rgba(15,90,220,0)",
  );
  limb.addColorStop(
    0.48,
    `rgba(70,170,255,${0.18 + blueLimb * 0.34})`,
  );
  limb.addColorStop(
    0.72,
    `rgba(190,235,255,${0.20 + blueLimb * 0.40})`,
  );
  limb.addColorStop(
    1,
    "rgba(210,245,255,0)",
  );

  ctx.fillStyle = limb;
  ctx.fillRect(
    0,
    horizonY - h * 0.10,
    w,
    h * 0.14,
  );

  ctx.restore();

  ctx.globalCompositeOperation = "screen";

  for (let i = 0; i < 13; i++) {
    const yy =
      horizonY +
      h * (0.015 + i * 0.016);

    ctx.strokeStyle =
      `rgba(235,245,250,${
        0.018 + (i % 4) * 0.010
      })`;

    ctx.lineWidth =
      2.5 + (i % 3) * 1.8;

    ctx.beginPath();

    ctx.moveTo(
      -w * 0.05,
      yy + Math.sin(i * 1.7) * 7,
    );

    ctx.bezierCurveTo(
      w * 0.22,
      yy - 12,
      w * 0.63,
      yy + 9,
      w * 1.06,
      yy - 4,
    );

    ctx.stroke();
  }

  ctx.restore();
}

function drawAtmosphereVolume(
  ctx: CanvasRenderingContext2D,
  earth: HTMLImageElement | null,
  w: number,
  h: number,
  atmosphereSceneMix: number,
  timeSinceEntryS: number,
  heading: number,
): void {
  if (
    atmosphereSceneMix <=
    0.001
  ) {
    return;
  }

  const mixIn =
    clamp01(
      atmosphereSceneMix,
    );

  const deep =
    smoothstep(
      (
        timeSinceEntryS -
        1.0
      ) /
        8.0,
    );

  const surfaceReveal =
    smoothstep(
      (
        timeSinceEntryS -
        1.2
      ) /
        5.8,
    );

  ctx.save();

  /*
   * Upper field: black space.
   * Lower field: blue atmosphere.
   *
   * The vector is slightly diagonal so the vehicle feels as if it is
   * penetrating a volume rather than crossing a horizontal UI stripe.
   */
  const ux =
    Math.cos(heading);

  const uy =
    Math.sin(heading);

  const sky =
    ctx.createLinearGradient(
      w * 0.10 -
        ux * w * 0.12,
      h * 0.02 -
        uy * h * 0.10,
      w * 0.72 +
        ux * w * 0.12,
      h * 0.96 +
        uy * h * 0.10,
    );

  sky.addColorStop(
    0,
    "rgba(0,2,8,1)",
  );

  sky.addColorStop(
    0.38,
    "rgba(1,7,18,1)",
  );

  sky.addColorStop(
    0.58,
    `rgba(7,31,70,${
      0.72 +
      mixIn * 0.18
    })`,
  );

  sky.addColorStop(
    0.78,
    `rgba(24,91,154,${
      0.58 +
      mixIn * 0.30
    })`,
  );

  sky.addColorStop(
    1,
    `rgba(108,177,218,${
      0.50 +
      mixIn * 0.42
    })`,
  );

  ctx.globalAlpha =
    mixIn;

  ctx.fillStyle = sky;
  ctx.fillRect(
    0,
    0,
    w,
    h,
  );

  /*
   * Curved Earth horizon.
   *
   * At entry it sits low in frame.
   * During the next several seconds the camera gets closer and the surface
   * occupies more of the screen.
   */
  const maxDim =
    Math.max(w, h);

  const earthR =
    maxDim *
    mix(
      0.96,
      1.72,
      deep,
    );

  const horizonTop =
    mix(
      h * 0.66,
      h * 0.31,
      deep,
    );

  const earthX =
    w *
    mix(
      0.46,
      0.52,
      deep,
    );

  const earthY =
    horizonTop + earthR;

  /*
   * Surface is deliberately faint during the first 1–2 seconds.
   * It then emerges underneath the blue atmosphere.
   */
  ctx.save();

  ctx.beginPath();
  ctx.arc(
    earthX,
    earthY,
    earthR,
    0,
    Math.PI * 2,
  );
  ctx.clip();

  ctx.globalAlpha =
    mixIn *
    mix(
      0.12,
      0.98,
      surfaceReveal,
    );

  if (
    earth &&
    earth.naturalWidth > 0
  ) {
    const sw =
      earth.naturalWidth *
      0.72;

    const sh =
      earth.naturalHeight *
      0.72;

    const sx =
      (
        earth.naturalWidth -
        sw
      ) *
      0.5;

    const sy =
      (
        earth.naturalHeight -
        sh
      ) *
      0.44;

    ctx.drawImage(
      earth,
      sx,
      sy,
      sw,
      sh,
      earthX - earthR,
      earthY - earthR,
      earthR * 2,
      earthR * 2,
    );
  } else {
    const ocean =
      ctx.createLinearGradient(
        0,
        horizonTop,
        0,
        h,
      );

    ocean.addColorStop(
      0,
      "#557e9a",
    );

    ocean.addColorStop(
      0.35,
      "#245574",
    );

    ocean.addColorStop(
      1,
      "#071e31",
    );

    ctx.fillStyle = ocean;
    ctx.fillRect(
      0,
      horizonTop,
      w,
      h - horizonTop,
    );
  }

  /*
   * Atmospheric blue cast over the surface.
   */
  ctx.globalCompositeOperation =
    "source-over";

  ctx.fillStyle =
    `rgba(20,72,125,${
      mix(
        0.54,
        0.18,
        surfaceReveal,
      )
    })`;

  ctx.fillRect(
    0,
    horizonTop,
    w,
    h - horizonTop,
  );

  /*
   * Irregular cloud structure for depth.
   */
  ctx.globalCompositeOperation =
    "screen";

  for (
    let i = 0;
    i < 9;
    i++
  ) {
    const yy =
      horizonTop +
      h *
        (
          0.035 +
          i * 0.045
        );

    ctx.strokeStyle =
      `rgba(235,245,250,${
        (
          0.020 +
          (i % 4) *
            0.010
        ) *
        surfaceReveal
      })`;

    ctx.lineWidth =
      2.4 +
      (i % 3) *
        1.7;

    ctx.beginPath();

    ctx.moveTo(
      -w * 0.08,
      yy +
        Math.sin(
          i * 1.9,
        ) *
          6,
    );

    ctx.bezierCurveTo(
      w * 0.20,
      yy - h * 0.018,
      w * 0.62,
      yy + h * 0.014,
      w * 1.08,
      yy - h * 0.010,
    );

    ctx.stroke();
  }

  ctx.restore();

  /*
   * Soft atmospheric rim.
   * No visible hard ring.
   */
  ctx.save();

  ctx.globalCompositeOperation =
    "lighter";

  const haze =
    ctx.createRadialGradient(
      earthX,
      earthY,
      earthR * 0.985,
      earthX,
      earthY,
      earthR * 1.035,
    );

  haze.addColorStop(
    0,
    "rgba(95,180,255,0)",
  );

  haze.addColorStop(
    0.34,
    `rgba(95,190,255,${
      0.10 +
      mixIn * 0.14
    })`,
  );

  haze.addColorStop(
    0.62,
    `rgba(195,235,255,${
      0.16 +
      mixIn * 0.20
    })`,
  );

  haze.addColorStop(
    0.82,
    `rgba(80,155,245,${
      0.08 +
      mixIn * 0.10
    })`,
  );

  haze.addColorStop(
    1,
    "rgba(40,105,210,0)",
  );

  ctx.fillStyle = haze;

  ctx.beginPath();

  ctx.arc(
    earthX,
    earthY,
    earthR * 1.04,
    0,
    Math.PI * 2,
  );

  ctx.fill();

  ctx.restore();

  ctx.restore();
}

function drawSuccessLanding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  craftLength: number,
  timeSinceVisualS: number,
): void {
  if (timeSinceVisualS < 14.6) return;

  const splash = smoothstep((timeSinceVisualS - 14.6) / 0.6);
  const hatch = smoothstep((timeSinceVisualS - 15.0) / 1.0);
  const alien = smoothstep((timeSinceVisualS - 16.0) / 0.45);
  const wave = Math.sin((timeSinceVisualS - 16) * Math.PI * 2.5) * 0.5 + 0.5;

  ctx.save();
  ctx.translate(x, y);

  ctx.globalAlpha = splash * 0.42;
  ctx.fillStyle = "rgba(210,236,248,0.75)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    craftLength * 0.18,
    craftLength * (1.15 + splash * 1.4),
    craftLength * (0.16 + splash * 0.12),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.globalAlpha = splash * 0.28;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(
    0,
    craftLength * 0.16,
    craftLength * (1.6 + splash),
    craftLength * 0.22,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  if (hatch > 0.02) {
    ctx.globalAlpha = 0.85 * hatch;
    ctx.fillStyle = "#1a2228";
    ctx.beginPath();
    ctx.ellipse(
      craftLength * 0.06,
      -craftLength * 0.08,
      craftLength * 0.09,
      craftLength * 0.05,
      -0.35,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#d8dde0";
    ctx.beginPath();
    ctx.ellipse(
      craftLength * 0.08,
      -craftLength * 0.16 * hatch,
      craftLength * 0.08,
      craftLength * 0.035,
      -0.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  if (alien > 0.02) {
    ctx.globalAlpha = alien;
    ctx.translate(craftLength * 0.18, -craftLength * 0.22);
    const s = craftLength * 0.085;
    ctx.fillStyle = "#c6d4b8";
    ctx.beginPath();
    ctx.ellipse(0, -s * 1.15, s * 0.72, s * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101418";
    ctx.beginPath();
    ctx.ellipse(-s * 0.22, -s * 1.22, s * 0.12, s * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(s * 0.22, -s * 1.22, s * 0.12, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c6d4b8";
    ctx.lineWidth = Math.max(1.2, s * 0.22);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.35);
    ctx.lineTo(0, s * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, s * 0.05);
    ctx.lineTo(-s * 0.7, s * 0.45);
    ctx.moveTo(0, s * 0.05);
    ctx.lineTo(s * (0.35 + wave * 0.7), -s * (0.55 + wave * 0.35));
    ctx.stroke();
  }

  ctx.restore();
}

function drawSurfaceApproach(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  surfaceMix: number,
): void {
  if (surfaceMix <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = surfaceMix;

  const sky = ctx.createLinearGradient(
    0,
    0,
    0,
    h * 0.72,
  );

  sky.addColorStop(
    0,
    "#1b5f9d",
  );
  sky.addColorStop(
    0.56,
    "#5ba3d2",
  );
  sky.addColorStop(
    1,
    "#b8d9ea",
  );

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const oceanY = h * 0.63;

  const ocean = ctx.createLinearGradient(
    0,
    oceanY,
    0,
    h,
  );

  ocean.addColorStop(
    0,
    "#457e9e",
  );
  ocean.addColorStop(
    0.38,
    "#245775",
  );
  ocean.addColorStop(
    1,
    "#0c2a3d",
  );

  ctx.fillStyle = ocean;
  ctx.fillRect(
    0,
    oceanY,
    w,
    h - oceanY,
  );

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

function drawTexturedEarthDisc(
  ctx: CanvasRenderingContext2D,
  earth: HTMLImageElement | null,
  cx: number,
  cy: number,
  r: number,
  surfaceAlpha: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = surfaceAlpha;
  if (earth && earth.naturalWidth > 0) {
    const sw = earth.naturalWidth * 0.72;
    const sh = earth.naturalHeight * 0.72;
    const sx = (earth.naturalWidth - sw) * 0.5;
    const sy = (earth.naturalHeight - sh) * 0.46;
    ctx.drawImage(
      earth,
      sx,
      sy,
      sw,
      sh,
      cx - r,
      cy - r,
      r * 2,
      r * 2,
    );
  } else {
    const g = ctx.createRadialGradient(
      cx - r * 0.28,
      cy - r * 0.32,
      r * 0.08,
      cx,
      cy,
      r,
    );
    g.addColorStop(0, "#6b9aba");
    g.addColorStop(0.5, "#214f70");
    g.addColorStop(1, "#06111d");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawCurvedAtmosphereRim(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  hazeStrength: number,
): void {
  if (hazeStrength <= 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const haze = ctx.createRadialGradient(
    cx,
    cy,
    r * 0.985,
    cx,
    cy,
    r * 1.11,
  );
  haze.addColorStop(0, "rgba(135,210,255,0.00)");
  haze.addColorStop(
    0.34,
    `rgba(125,205,255,${0.06 + hazeStrength * 0.07})`,
  );
  haze.addColorStop(
    0.64,
    `rgba(95,175,255,${0.045 + hazeStrength * 0.055})`,
  );
  haze.addColorStop(1, "rgba(55,120,235,0.00)");
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function spaceScreenPose(
  state: SpaceState,
  first: SpaceState,
  launchX: number,
  launchY: number,
  scale: number,
): { x: number; y: number; angle: number } {
  return {
    x: launchX + (state.position.x - first.position.x) * scale,
    y: launchY - (state.position.y - first.position.y) * scale,
    angle: canvasHeadingFromWorld(state.velocity),
  };
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
  // Compact lifting-body silhouette with a broad heat-shielded aft section.
  ctx.beginPath();
  ctx.moveTo(length * 0.62, 0);
  ctx.bezierCurveTo(
    length * 0.48,
    -width * 0.11,
    length * 0.30,
    -width * 0.18,
    length * 0.10,
    -width * 0.22,
  );
  ctx.lineTo(-length * 0.12, -width * 0.46);
  ctx.lineTo(-length * 0.40, -width * 0.52);
  ctx.lineTo(-length * 0.56, -width * 0.30);
  ctx.lineTo(-length * 0.50, 0);
  ctx.lineTo(-length * 0.56, width * 0.30);
  ctx.lineTo(-length * 0.40, width * 0.52);
  ctx.lineTo(-length * 0.12, width * 0.46);
  ctx.lineTo(length * 0.10, width * 0.22);
  ctx.bezierCurveTo(
    length * 0.30,
    width * 0.18,
    length * 0.48,
    width * 0.11,
    length * 0.62,
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
  const width = length * 0.62;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  // Deep heat-shield shadow gives the craft thickness without a photo asset.
  ctx.save();
  ctx.translate(-length * 0.03, length * 0.035);
  craftOutline(ctx, length, width);
  ctx.fillStyle = "#070b0e";
  ctx.shadowColor =
    heat > 0.14
      ? `rgba(255,88,18,${0.18 + heat * 0.34})`
      : "rgba(0,0,0,0.78)";
  ctx.shadowBlur = heat > 0.14 ? 8 + heat * 18 : 7;
  ctx.fill();
  ctx.restore();

  // Main upper body.
  craftOutline(ctx, length, width);
  const hull = ctx.createLinearGradient(
    -length * 0.52,
    -width * 0.28,
    length * 0.62,
    width * 0.22,
  );
  hull.addColorStop(0, "#60686e");
  hull.addColorStop(0.18, "#b9bec0");
  hull.addColorStop(0.43, "#ecece8");
  hull.addColorStop(0.68, "#faf8f1");
  hull.addColorStop(0.86, "#b7bdc0");
  hull.addColorStop(1, "#737c82");
  ctx.fillStyle = hull;
  ctx.fill();

  ctx.save();
  craftOutline(ctx, length, width);
  ctx.clip();

  // Faceted lower half / thermal protection.
  const shield = ctx.createLinearGradient(
    0,
    -width * 0.35,
    0,
    width * 0.54,
  );
  shield.addColorStop(0.38, "rgba(20,24,28,0)");
  shield.addColorStop(0.58, "rgba(14,18,22,0.25)");
  shield.addColorStop(0.78, "rgba(7,10,12,0.58)");
  shield.addColorStop(1, "rgba(2,4,6,0.93)");
  ctx.fillStyle = shield;
  ctx.fillRect(-length, -width, length * 2, width * 2);

  // Side facets create a more three-dimensional lifting-body form.
  ctx.fillStyle = "rgba(80,90,97,0.28)";
  ctx.beginPath();
  ctx.moveTo(-length * 0.50, -width * 0.30);
  ctx.lineTo(-length * 0.12, -width * 0.46);
  ctx.lineTo(length * 0.20, -width * 0.17);
  ctx.lineTo(-length * 0.12, -width * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.beginPath();
  ctx.moveTo(-length * 0.12, width * 0.08);
  ctx.lineTo(length * 0.22, width * 0.14);
  ctx.lineTo(length * 0.45, width * 0.04);
  ctx.lineTo(length * 0.12, width * 0.01);
  ctx.closePath();
  ctx.fill();

  // Irregular panel seams: subtle and non-uniform.
  ctx.strokeStyle = "rgba(44,52,57,0.20)";
  ctx.lineWidth = Math.max(0.65, length * 0.006);
  const seams = [-0.34, -0.18, 0.02, 0.19, 0.34];
  for (let i = 0; i < seams.length; i++) {
    const px = length * seams[i];
    ctx.beginPath();
    ctx.moveTo(px, -width * (0.18 + (i % 2) * 0.03));
    ctx.lineTo(
      px + length * (0.018 + (i % 3) * 0.008),
      width * (0.17 + (i % 2) * 0.025),
    );
    ctx.stroke();
  }
  ctx.restore();

  // Dark recessed cockpit glazing near the nose.
  ctx.save();
  ctx.translate(length * 0.31, 0);
  const glass = ctx.createLinearGradient(
    -length * 0.12,
    -width * 0.11,
    length * 0.10,
    width * 0.10,
  );
  glass.addColorStop(0, "#495a65");
  glass.addColorStop(0.28, "#17232c");
  glass.addColorStop(0.72, "#070d12");
  glass.addColorStop(1, "#020406");
  ctx.fillStyle = glass;
  ctx.strokeStyle = "rgba(210,228,238,0.38)";
  ctx.lineWidth = Math.max(0.75, length * 0.007);
  ctx.beginPath();
  ctx.moveTo(length * 0.13, 0);
  ctx.lineTo(-length * 0.025, -width * 0.105);
  ctx.lineTo(-length * 0.13, -width * 0.070);
  ctx.lineTo(-length * 0.13, width * 0.070);
  ctx.lineTo(-length * 0.025, width * 0.105);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Rear heat shield edge.
  ctx.strokeStyle = "rgba(15,18,20,0.75)";
  ctx.lineWidth = Math.max(1.1, length * 0.012);
  ctx.beginPath();
  ctx.moveTo(-length * 0.52, -width * 0.27);
  ctx.lineTo(-length * 0.47, width * 0.27);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.46)";
  ctx.lineWidth = Math.max(0.7, length * 0.0065);
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
  seed = 1,
): void {
  if (heat < 0.12) return;

  const intensity = smoothstep((heat - 0.12) / 0.88);
  const timeBucket = Math.floor(playback * 96);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // Non-uniform streamlines. Positions, lengths and bends are deterministic
  // but intentionally irregular so they do not read as evenly spaced wires.
  for (let i = 0; i < 15; i++) {
    const a = hash01(seed ^ 0x35a7f1c9, i * 11 + timeBucket);
    const b = hash01(seed ^ 0x7f4a7c15, i * 17 + 5);
    const c = hash01(seed ^ 0x91e10da5, i * 23 + 9);
    const side = (a - 0.5) * 2;
    const y0 =
      side * length * (0.08 + intensity * (0.12 + b * 0.10));
    const back =
      length * (0.75 + b * 0.8 + intensity * (1.25 + c * 1.5));
    const bend =
      (c - 0.5) * length * (0.10 + intensity * 0.18);

    ctx.strokeStyle =
      a > 0.72
        ? `rgba(247,252,255,${0.035 + intensity * 0.11})`
        : b > 0.48
          ? `rgba(255,208,112,${0.03 + intensity * 0.09})`
          : `rgba(255,109,28,${0.025 + intensity * 0.075})`;
    ctx.lineWidth =
      0.45 + c * 1.15 + intensity * 0.55;

    ctx.beginPath();
    ctx.moveTo(length * (0.54 + c * 0.07), y0 * 0.28);
    ctx.bezierCurveTo(
      length * (0.10 + b * 0.10),
      y0 + bend * 0.35,
      -length * (0.45 + a * 0.38),
      y0 * (1.35 + b * 0.8) - bend,
      -back,
      y0 * (1.8 + c * 1.25),
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
  const timeBucket = Math.floor(playback * 120);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";

  // Detached rounded bow-shock volume.
  const domeX = length * (0.60 + intensity * 0.04);
  const domeRx = length * (0.20 + intensity * 0.20);
  const domeRy = width * (0.48 + intensity * 0.38);

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
    `rgba(248,253,255,${0.08 + intensity * 0.42})`,
  );
  outer.addColorStop(
    0.24,
    `rgba(255,250,222,${0.10 + intensity * 0.38})`,
  );
  outer.addColorStop(
    0.50,
    `rgba(255,191,78,${0.08 + intensity * 0.32})`,
  );
  outer.addColorStop(
    0.74,
    `rgba(255,86,18,${0.06 + intensity * 0.24})`,
  );
  outer.addColorStop(
    0.91,
    `rgba(178,26,5,${0.025 + intensity * 0.13})`,
  );
  outer.addColorStop(1, "rgba(90,4,0,0)");

  ctx.fillStyle = outer;
  ctx.shadowColor =
    `rgba(255,92,18,${0.25 + intensity * 0.44})`;
  ctx.shadowBlur = 10 + intensity * 30;
  ctx.beginPath();
  ctx.ellipse(0, 0, domeRx, domeRx * 0.92, 0.08, -Math.PI * 0.82, Math.PI * 0.82);
  ctx.fill();

  const core = ctx.createRadialGradient(
    -domeRx * 0.24,
    0,
    0,
    -domeRx * 0.08,
    0,
    domeRx * 0.56,
  );
  core.addColorStop(
    0,
    `rgba(250,254,255,${0.10 + intensity * 0.48})`,
  );
  core.addColorStop(
    0.32,
    `rgba(255,252,232,${0.10 + intensity * 0.39})`,
  );
  core.addColorStop(
    0.72,
    `rgba(255,151,40,${0.05 + intensity * 0.20})`,
  );
  core.addColorStop(1, "rgba(255,68,12,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(-domeRx * 0.08, 0, domeRx * 0.64, domeRx * 0.52, 0.06, -Math.PI * 0.9, Math.PI * 0.9);
  ctx.fill();

  ctx.restore();

  // Plasma sheath around the body.
  const sheath = ctx.createLinearGradient(
    -length * 1.95,
    0,
    length * 0.67,
    0,
  );
  sheath.addColorStop(0, "rgba(120,14,3,0)");
  sheath.addColorStop(
    0.30,
    `rgba(208,37,8,${0.035 + intensity * 0.12})`,
  );
  sheath.addColorStop(
    0.54,
    `rgba(255,82,14,${0.065 + intensity * 0.19})`,
  );
  sheath.addColorStop(
    0.77,
    `rgba(255,176,55,${0.085 + intensity * 0.25})`,
  );
  sheath.addColorStop(
    0.94,
    `rgba(255,245,210,${0.085 + intensity * 0.30})`,
  );
  sheath.addColorStop(1, "rgba(248,253,255,0)");

  ctx.fillStyle = sheath;
  ctx.shadowColor =
    `rgba(255,73,12,${0.20 + intensity * 0.36})`;
  ctx.shadowBlur = 7 + intensity * 24;

  ctx.beginPath();
  ctx.moveTo(length * 0.62, 0);
  ctx.bezierCurveTo(
    length * 0.22,
    -width * (0.44 + intensity * 0.18),
    -length * 0.30,
    -width * (0.66 + intensity * 0.30),
    -length * 1.58,
    -width * 0.16,
  );
  ctx.lineTo(-length * 2.25, 0);
  ctx.lineTo(-length * 1.58, width * 0.16);
  ctx.bezierCurveTo(
    -length * 0.30,
    width * (0.66 + intensity * 0.30),
    length * 0.22,
    width * (0.44 + intensity * 0.18),
    length * 0.62,
    0,
  );
  ctx.closePath();
  ctx.fill();

  // Irregular incandescent sparks: short streaks / flakes rather than circles.
  for (let i = 0; i < 34; i++) {
    const a = hash01(seed ^ 0x43f14a1d, i * 13 + timeBucket);
    const b = hash01(seed ^ 0xa511e9b3, i * 19 + 3);
    const c = hash01(seed ^ 0x27d4eb2f, i * 29 + 17);

    const back = length * (0.58 + a * (1.6 + intensity * 2.35));
    const py =
      width * (b - 0.5) * (0.20 + intensity * 1.05);
    const sparkLen =
      length * (0.035 + c * 0.12) * (0.5 + intensity);
    const drift = (b - 0.5) * length * 0.08;

    const hot = 1 - clamp01(back / (length * 3.6));
    const alpha =
      (0.04 + intensity * 0.28) * (0.45 + hot * 0.55);

    ctx.strokeStyle =
      hot > 0.72
        ? `rgba(255,250,226,${alpha})`
        : hot > 0.44
          ? `rgba(255,174,52,${alpha})`
          : `rgba(218,47,10,${alpha * 0.74})`;
    ctx.lineWidth = 0.55 + c * 1.1;
    ctx.beginPath();
    ctx.moveTo(-back, py);
    ctx.lineTo(-back - sparkLen, py + drift);
    ctx.stroke();

    if (i % 7 === 0 && intensity > 0.52) {
      const s = Math.max(0.7, length * (0.010 + c * 0.009));
      ctx.fillStyle = `rgba(255,205,92,${alpha * 0.65})`;
      ctx.beginPath();
      ctx.moveTo(-back, py - s);
      ctx.lineTo(-back + s * 0.9, py + s * 0.2);
      ctx.lineTo(-back - s * 0.7, py + s * 0.8);
      ctx.closePath();
      ctx.fill();
    }
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
  altitudeM: number,
  outcome: ReentryOutcome | undefined,
): number {
  /*
   * Presentation-only visibility gate.
   *
   * The simulation may already report non-zero heating in the very thin
   * upper atmosphere, but that should not look like a bright movie-style
   * plasma envelope while Earth is still visibly far away.
   *
   * > 95 km : visually dark
   * ~90 km  : only the faintest hint
   * ~80 km  : visible entry glow begins
   * ~70 km  : strong plasma
   * <=55 km : full presentation intensity
   *
   * This does NOT alter physics, heatFlux, integrity, or outcome.
   */
  /*
   * Presentation only.
   *
   * > 82 km : orange plasma OFF
   * ~78 km  : extremely faint onset
   * ~68 km  : clearly visible
   * <=52 km : full presentation intensity
   *
   * Physics and outcome are unchanged.
   */
  if (altitudeM >= 82_000) return 0;

  const altitudeGate = smoothstep(
    (82_000 - altitudeM) / 30_000,
  );

  const onsetSoftener = smoothstep(
    (77_000 - altitudeM) / 12_000,
  );

  let heat =
    physicalHeat * altitudeGate;

  if (outcome === "BURN") {
    heat = Math.max(
      heat,
      altitudeGate * 0.98,
    );
  } else if (outcome === "BREAK") {
    heat = Math.max(
      heat,
      altitudeGate * 0.82,
    );
  } else if (
    outcome === "EARTH_REACHED"
  ) {
    heat = Math.max(
      heat,
      altitudeGate * 0.72,
    );
  } else if (outcome === "SKIP") {
    return 0;
  }

  return clamp01(
    heat *
      mix(
        0.08,
        1,
        onsetSoftener,
      ),
  );
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
  spaceApproach,
  spaceShare,
  powerNorm,
  variant,
}: {
  phase: ReentryPhase;
  result: ReentryResult | null;
  flightProgress: number;
  angleNorm: number;
  spaceApproach: SpaceApproachResult | null;
  spaceShare: number;
  powerNorm: number;
  variant: ReentryArtVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earthRef = useRef<HTMLImageElement | null>(null);
  const resultSoundRef = useRef<string | null>(null);
  const visualLatchPlaybackRef = useRef<number | null>(null);
  const latchPhysicsPlaybackRef = useRef(0);
  const latchPoseRef = useRef<{ x: number; y: number; angle: number } | null>(
    null,
  );
  const prevHeadingRef = useRef<number | null>(null);

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
      startReentryAmbience();
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
      const miss = spaceApproach?.kind === "SPACE_MISS";
      const physicsHandoffReached =
        !idle &&
        !miss &&
        !!spaceApproach &&
        spaceApproach.kind === "ATMOSPHERE_ENTRY" &&
        playback > spaceShare;
      const spaceT = miss
        ? playback
        : spaceShare > 0
          ? Math.min(1, playback / Math.max(1e-4, spaceShare))
          : 1;
      const atmosphereT =
        miss || spaceShare >= 1
          ? 0
          : Math.max(0, (playback - spaceShare) / Math.max(1e-4, 1 - spaceShare));
      const physicsPlayback = atmosphereT;

      const idleSpace = launchSpaceApproach(
        mapLaunchToInput(0.5, angleNorm, 1).initialSpeedMps,
        angleNorm,
      );
      const activeSpace = spaceApproach ?? idleSpace;
      const firstSpace = activeSpace.points[0]?.state;
      const periIdx = closestApproachIndex(activeSpace.points);
      const travelT =
        spaceTravelT(
          spaceT,
          powerNorm,
          miss,
        );

      const pathT =
        miss
          ? missPlaybackToPathT(
              spaceT,
              periIdx,
              activeSpace.points.length,
            )
          : travelT;

      const sampledSpace =
        sampleSpacePoint(
          activeSpace.points,
          pathT,
        );

      const spaceState =
        sampledSpace?.state ??
        firstSpace;

      const frame =
        result &&
        (phase === "flight" || phase === "result") &&
        physicsHandoffReached
          ? sampleFrame(
              result.frames,
              playbackToFrameProgress(
                physicsPlayback,
                outcome ?? "BURN",
              ),
            )
          : restFrame(result);

      const displayAltitude =
        !physicsHandoffReached && sampledSpace
          ? sampledSpace.altitudeM
          : frame.altitudeM;

      const stageMix = miss
        ? reentryStageMix(160_000)
        : reentryStageMix(displayAltitude);

      const launch = launchAnchorPx(w, h);
      const launchHeading = directionNormToScreenHeadingRad(angleNorm);

      const pathEarth =
        launchEarthView(w, h);

      const pathThickness =
        atmosphereThicknessPx(
          pathEarth.r,
        );

      if (idle || miss) {
        visualLatchPlaybackRef.current = null;
        latchPoseRef.current = null;
      }

      const earthCam = cinematicEarthView({
        w,
        h,
        idle,
        miss,
        travelT,
        spaceT,
      });
      const earth = {
        x: earthCam.x,
        y: earthCam.y,
        r: earthCam.r,
        horizonMix: stageMix.atmosphere,
        alpha: 1,
      };

      const thickness =
        atmosphereThicknessPx(
          earth.r,
        );

      const entryTarget =
        miss
          ? {
              x:
                launch.x +
                (pathEarth.x - launch.x) *
                  1.55,
              y:
                launch.y +
                (pathEarth.y - launch.y) *
                  1.55,
            }
          : headingHazeEntryTarget(
              launch,
              pathEarth,
              pathThickness,
              launchHeading,
            );

      let pose = {
        x: launch.x,
        y: launch.y,
        angle: launchHeading,
      };

      if (firstSpace && spaceState) {
        if (miss) {
          const periPt = activeSpace.points[periIdx]?.state ?? firstSpace;
          const periScreen = hazeEntryTarget(launch, earth, thickness);
          const scale = gravityPathScalePx(
            firstSpace.position,
            periPt.position,
            launch,
            periScreen,
          );
          const traveled = gravityScreenPosition(
            spaceState.position,
            firstSpace.position,
            launch,
            scale,
          );
          pose = {
            x: traveled.x,
            y: traveled.y,
            angle: canvasHeadingFromWorld(spaceState.velocity),
          };
        } else {
          const terminalSpace =
            activeSpace.points[
              activeSpace.points.length - 1
            ]?.state ??
            spaceState;

          pose =
            inboundGravityScreenPose({
              currentPosition:
                spaceState.position,
              currentVelocity:
                spaceState.velocity,
              initialPosition:
                firstSpace.position,
              initialVelocity:
                firstSpace.velocity,
              terminalPosition:
                terminalSpace.position,
              launchPoint:
                launch,
              entryTargetPoint:
                entryTarget,
              launchHeading,
            });
        }
      }

      const atmosphereDistancePx =
        signedDistanceToAtmospherePx(
          pose.x,
          pose.y,
          pathEarth.x,
          pathEarth.y,
          pathEarth.r,
          pathThickness,
        );

      const visualAtmosphereEntry =
        physicsHandoffReached &&
        atmosphereDistancePx <= 1.5;

      if (visualAtmosphereEntry && visualLatchPlaybackRef.current === null) {
        visualLatchPlaybackRef.current = playback;
        latchPhysicsPlaybackRef.current = physicsPlayback;
        latchPoseRef.current = { ...pose };
      }

      const latched = visualLatchPlaybackRef.current !== null;
      const timeSinceVisualAtmosphereEntryS = latched
        ? elapsedSincePlaybackS(
            playback,
            visualLatchPlaybackRef.current ?? playback,
            Math.max(1e-4, spaceShare),
            SPACE_INBOUND_DURATION_MS,
          )
        : 0;
      const atmosphereSceneMix =
        latched && !miss
          ? smoothstep(
              timeSinceVisualAtmosphereEntryS /
                1.05,
            )
          : 0;


      if (
        latched &&
        result &&
        latchPoseRef.current &&
        !miss
      ) {
        const initialAltitudeM =
          result.frames[0]?.altitudeM ??
          frame.altitudeM;

        const progressNow =
          playbackToFrameProgress(
            physicsPlayback,
            outcome ?? "BURN",
          );

        const prevFrame =
          sampleFrame(
            result.frames,
            Math.max(
              0,
              progressNow - 0.012,
            ),
          );

        const nextFrame =
          sampleFrame(
            result.frames,
            Math.min(
              1,
              progressNow + 0.012,
            ),
          );

        const prevP =
          projectPhysicsFrame(
            prevFrame,
            initialAltitudeM,
            w,
            h,
          );

        const nowP =
          projectPhysicsFrame(
            frame,
            initialAltitudeM,
            w,
            h,
          );

        const nextP =
          projectPhysicsFrame(
            nextFrame,
            initialAltitudeM,
            w,
            h,
          );

        const physicalAngle =
          tangentAngleFromPoints(
            prevP,
            nowP,
            nextP,
            latchPoseRef.current.angle,
          );

        /*
         * Tracking-shot entry camera:
         * the ship keeps its entry direction; the camera moves with it.
         * This prevents the tiny ship from freezing beside the globe.
         */
        const cameraIn =
          smoothstep(
            timeSinceVisualAtmosphereEntryS /
              0.85,
          );

        const minSide =
          Math.min(w, h);

        const atmosphericAnchor = {
          x: w * 0.63,
          y: h * 0.34,
        };

        const forwardDrift =
          minSide *
          0.075 *
          smoothstep(
            timeSinceVisualAtmosphereEntryS /
              7.5,
          );

        const entryAngle =
          latchPoseRef.current.angle;

        const tracked = {
          x:
            atmosphericAnchor.x +
            Math.cos(entryAngle) *
              forwardDrift,
          y:
            atmosphericAnchor.y +
            Math.sin(entryAngle) *
              forwardDrift,
        };

        const aeroAngleMix =
          smoothstep(
            (
              timeSinceVisualAtmosphereEntryS -
              2.4
            ) /
              4.0,
          ) *
          0.42;

        let trackedAngle =
          lerpAngle(
            entryAngle,
            physicalAngle,
            aeroAngleMix,
          );

        let trackedX =
          mix(
            latchPoseRef.current.x,
            tracked.x,
            cameraIn,
          );

        let trackedY =
          mix(
            latchPoseRef.current.y,
            tracked.y,
            cameraIn,
          );

        const landing =
          outcome === "EARTH_REACHED"
            ? successLandingT(
                timeSinceVisualAtmosphereEntryS,
              )
            : 0;

        if (landing > 0) {
          const ocean = {
            x: w * 0.48,
            y: h * 0.78,
          };

          trackedX =
            mix(
              trackedX,
              ocean.x,
              landing,
            );

          trackedY =
            mix(
              trackedY,
              ocean.y,
              landing,
            );

          trackedAngle =
            lerpAngle(
              trackedAngle,
              Math.PI / 2,
              smoothstep(landing) * 0.72,
            );
        }

        pose = {
          x: trackedX,
          y: trackedY,
          angle: trackedAngle,
        };
      }

      if (prevHeadingRef.current === null || idle) {
        prevHeadingRef.current = pose.angle;
      } else {
        pose.angle = clampHeadingJump(prevHeadingRef.current, pose.angle);
        prevHeadingRef.current = pose.angle;
      }

      const atmosphereGate = latched && !miss ? 1 : 0;
      const plasmaAge = !latched || miss
        ? 0
        : clamp01((timeSinceVisualAtmosphereEntryS - 0.7) / 2.3);
      const failureUnlocked =
        latched &&
        !miss &&
        timeSinceVisualAtmosphereEntryS >= ATMOSPHERE_SURVIVE_S;
      const rawHeat =
        !latched || miss || idle
          ? 0
          : presentationHeatGlow(
              frame.heatFluxWm2,
              physicsPlayback,
              outcome ?? "BURN",
            );
      const gatedHeat =
        !latched || miss || idle
          ? 0
          : readableHeat(rawHeat, displayAltitude, outcome);
      const landingHeatCut =
        outcome === "EARTH_REACHED"
          ? 1 - successLandingT(timeSinceVisualAtmosphereEntryS)
          : 1;
      const heat =
        miss || !latched || outcome === "SKIP"
          ? 0
          : gatedHeat * atmosphereGate * plasmaAge * landingHeatCut;

      if (variant === "stage" && phase === "flight") {
        setReentryAudioFlight(playback, heat, outcome);
      }

      drawStars(
        ctx,
        w,
        h,
        playback,
        !idle && !miss,
        0,
        miss || !latched
          ? 1
          : 1 -
            atmosphereSceneMix *
              0.96,
      );

      /*
       * SPACE globe.
       *
       * Keep it visible and stable until the craft actually touches the haze.
       * Crossfade it away only after atmospheric entry.
       */
      const spaceGlobeAlpha =
        1 -
        atmosphereSceneMix;

      if (
        spaceGlobeAlpha >
        0.01
      ) {
        drawTexturedEarthDisc(
          ctx,
          earthRef.current,
          earth.x,
          earth.y,
          earth.r,
          (
            miss
              ? 0.78
              : 0.88
          ) *
            spaceGlobeAlpha,
        );

        drawCurvedAtmosphereRim(
          ctx,
          earth.x,
          earth.y,
          earth.r,
          (
            miss
              ? 0.12
              : mix(
                  0.10,
                  0.22,
                  travelT,
                )
          ) *
            spaceGlobeAlpha,
        );
      }

      /*
       * ATMOSPHERE camera.
       *
       * This begins only after visual haze contact.
       * It replaces the small globe with a curved real-surface horizon.
       */
      if (
        latched &&
        !miss
      ) {
        drawAtmosphereVolume(
          ctx,
          earthRef.current,
          w,
          h,
          atmosphereSceneMix,
          timeSinceVisualAtmosphereEntryS,
          pose.angle,
        );

        const showSurfaceApproach =
          outcome ===
            "EARTH_REACHED" &&
          timeSinceVisualAtmosphereEntryS >=
            10.5;

        if (
          showSurfaceApproach
        ) {
          drawSurfaceApproach(
            ctx,
            w,
            h,
            smoothstep(
              (
                timeSinceVisualAtmosphereEntryS -
                10.5
              ) /
                2.2,
            ),
          );
        }
      }

      const baseCraft =
        Math.min(w, h) *
        (
          variant ===
          "preview"
            ? 0.088
            : 0.102
        );

      let craftLength =
        baseCraft * 0.72;

      if (idle) {
        craftLength =
          baseCraft * 0.72;
      } else if (miss) {
        /*
         * The craft becomes rice-grain small near Earth and even smaller
         * outbound. This fixes the "continent-sized spacecraft" illusion.
         */
        const toPeriapsis =
          smoothstep(
            spaceT / 0.48,
          );

        const outbound =
          smoothstep(
            (
              spaceT -
              0.48
            ) /
              0.52,
          );

        const nearScale =
          mix(
            0.72,
            0.16,
            toPeriapsis,
          );

        const departedScale =
          mix(
            0.16,
            0.055,
            outbound,
          );

        craftLength =
          baseCraft *
          (
            spaceT <
            0.48
              ? nearScale
              : departedScale
          );
      } else if (!latched) {
        /*
         * During inbound SPACE, Earth stays visually stable while the craft
         * itself supplies the closing motion and scale cue.
         */
        craftLength =
          baseCraft *
          mix(
            0.72,
            0.145,
            smoothstep(
              travelT,
            ),
          );
      } else {
        /*
         * Atmospheric camera cuts closer again after haze contact.
         * Start near the rice-grain contact scale, then make the vehicle
         * readable for plasma / breakup without ever becoming enormous.
         */
        const atmosphereClose =
          smoothstep(
            timeSinceVisualAtmosphereEntryS /
              2.6,
          );

        const landingClose =
          outcome ===
            "EARTH_REACHED"
            ? successLandingT(
                timeSinceVisualAtmosphereEntryS,
              )
            : 0;

        craftLength =
          baseCraft *
          mix(
            0.16,
            mix(
              0.48,
              0.58,
              landingClose,
            ),
            atmosphereClose,
          );
      }

      const destructionAmount = smoothstep(
        destructionAmountFromEntryS(
          timeSinceVisualAtmosphereEntryS,
          outcome,
        ),
      );

      let craftAlpha = 1;
      if (miss) {
        craftAlpha =
          1 -
          smoothstep(
            (
              spaceT -
              0.90
            ) /
              0.10,
          );
      } else if (outcome === "BURN") {
        craftAlpha = 1 - destructionAmount;
      } else if (outcome === "BREAK") {
        craftAlpha = 1 - destructionAmount * 0.85;
      }

      const burnGone =
        outcome === "BURN" &&
        (phase === "result" || destructionAmount >= 0.97);

      const terminalFailure =
        phase === "result" &&
        (outcome === "BURN" || outcome === "BREAK");

      const showPlasma =
        !idle &&
        !miss &&
        latched &&
        !burnGone &&
        !terminalFailure &&
        heat > 0;

      if (showPlasma) {
        drawFlowLines(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          heat,
          playback,
          result?.seed ?? 1,
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
        failureUnlocked &&
        outcome === "BREAK" &&
        destructionAmount > 0.02
      ) {
        drawBreakup(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          result?.seed ?? 1,
          destructionAmount,
        );
      }

      if (
        failureUnlocked &&
        outcome === "BURN" &&
        destructionAmount > 0.02 &&
        destructionAmount < 0.97
      ) {
        drawBurnDisintegration(
          ctx,
          pose.x,
          pose.y,
          pose.angle,
          craftLength,
          result?.seed ?? 1,
          destructionAmount,
        );
      }

      if (outcome === "EARTH_REACHED" && latched && !miss) {
        drawSuccessLanding(
          ctx,
          pose.x,
          pose.y,
          craftLength,
          timeSinceVisualAtmosphereEntryS,
        );
      }

      if (
        phase === "result" &&
        outcome &&
        variant !== "stage"
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
    spaceApproach,
    spaceShare,
    powerNorm,
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

void earthView;
void drawEarth;
void craftPose;
void visualAtmosphereGate;
void lerpAngle;
void spaceScreenPose;
void drawAtmosphericHorizon;
