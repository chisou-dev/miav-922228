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
} from "./reentryCraftProjection";
import {
  reentryStageMix,
  visualAtmosphereGate,
} from "./reentryCinematicStages";
import {
  canvasHeadingFromWorld,
  directionNormToScreenHeadingRad,
  launchSpaceApproach,
  sampleSpacePoint,
  sampleSpacePointByElapsed01,
  type SpaceApproachResult,
  type SpaceState,
} from "./reentrySpaceApproach";
import { mapLaunchToInput } from "./reentryLaunchInput";
import {
  cinematicEarthView,
  launchEarthView,
} from "./reentryEarthCamera";
import {
  atmosphereTransitionDurationS,
  DESTRUCTION_BURST_S,
  destructionAmountFromEntryS,
  failureDestructionStartS,
  failureVisualDepth01,
  spaceInboundDurationMs,
  successLandingT,
  STAGE1_SPLASH_S,
  STAGE1_ABSORB_START_S,
  STAGE1_ABSORB_END_S,
  STAGE1_BOARD_COMPLETE_S,
  STAGE1_CLEAR_HOLD_END_S,
  STAGE1_GLIDE_END_S,
  STAGE1_ESCAPE_EXIT_S,
} from "./reentryStageTimeline";
import {
  atmosphereThicknessPx,
  clampHeadingJump,
  closestApproachIndex,
  elapsedSincePlaybackS,
  gravitationalFlybyScreenPose,
  missPlaybackToPathT,
  signedDistanceToAtmospherePx,
  straightSpaceScreenPose,
  spaceTravelT,
} from "./reentryVisualCausality";
import {
  finishReentryAudio,
  setReentryAudioFlight,
  startReentryAmbience,
  startStage1ClearAudio,
} from "./reentryAudio";
import {
  createReentryOceanWebGLRenderer,
  type ReentryOceanWebGLRenderer,
} from "./reentryOceanWebGL";
const EARTH_SOURCE = "/reentry/source/stage1-space-earth-original.jpg";

/*
 * Real NASA/JSC astronaut ISS photos, not an equirectangular map.
 * ISS068-E-8010 (2022-10-03) / ISS073-E-28418 (2025-05-04).
 * Source and credit: NASA / ISS Crew Earth Observations, eol.jsc.nasa.gov.
 * No NASA endorsement is implied.
 */
const ISS_EARTH_PHOTOS = [
  "https://eol.jsc.nasa.gov/DatabaseImages/ESC/large/ISS068/ISS068-E-8010.JPG",
  "https://eol.jsc.nasa.gov/DatabaseImages/ESC/large/ISS073/ISS073-E-28418.JPG",
] as const;

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

function lineAngleNearHorizontal(angle: number): number {
  let a = angle;
  while (a > Math.PI / 2) a -= Math.PI;
  while (a < -Math.PI / 2) a += Math.PI;
  return Math.max(-0.48, Math.min(0.48, a));
}

function angularDistance(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function descendingCameraHeading(
  horizonAngle: number,
  gammaAbsRad: number,
  referenceHeading: number,
): number {
  const gamma = Math.max(0.025, Math.min(1.15, Math.abs(gammaAbsRad)));
  const rightward = horizonAngle + gamma;
  const leftward = horizonAngle + Math.PI - gamma;
  return angularDistance(referenceHeading, rightward) <=
    angularDistance(referenceHeading, leftward)
    ? rightward
    : leftward;
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


// Cinematic camera; no computed geographic impact coordinates.
interface EarthPhotoCamera {
  photoIndex: number;
  pan: number;
  zoom: number;
  shift: number;
  bank: number;
}
function entrySurfaceRegion(power: number, aim: number, seed: number, utcHour: number): EarthPhotoCamera {
  const a = ((aim % 1) + 1) % 1;
  const photoIndex = Math.floor(hash01(seed ^ Math.imul(Math.floor(utcHour / 4) + 1, 991), 93) * 2) % 2;
  return {
    photoIndex,
    pan: (hash01(seed, 67) - 0.5) * 0.85 + (power - 0.5) * 0.28 + (a - 0.5) * 0.35,
    zoom: (hash01(seed, 117) - 0.5) * 0.10 + power * 0.07,
    shift: (hash01(seed, 207) - 0.5) * 0.055 + (power - 0.5) * 0.035,
    bank: (a - 0.5) * 0.085,
  };
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
  // Stars stay fixed in the cinematic camera; only luminance changes.
  void playback;
  void moving;

  const fade = (1 - horizonMix * 0.90) * stars;
  const clockS = typeof performance !== "undefined" ? performance.now() / 1000 : 0;

  ctx.save();
  ctx.globalAlpha = fade;

  for (let i = 0; i < 210; i++) {
    const rx = hash01(0x51a2, i * 7 + 1);
    const ry = hash01(0x71c9, i * 11 + 3);
    const rb = hash01(0x91ef, i * 13 + 5);
    const phase = hash01(0xa217, i * 17 + 9) * Math.PI * 2;
    const x = rx * w;
    const y = ry * h;
    const bright = i % 31 === 0;
    const cool = i % 43 === 0;
    const warm = i % 53 === 0;

    const shimmer =
      0.88 +
      Math.sin(clockS * (1.7 + rb * 0.9) + phase) * (bright ? 0.070 : 0.026) +
      Math.sin(clockS * (4.9 + rb * 2.0) + phase * 1.71) *
        (bright || cool || warm ? 0.045 : 0.013) +
      Math.sin(clockS * (10.7 + rb * 3.4) + phase * 2.37) *
        (bright ? 0.022 : 0.006);

    const alpha =
      (bright ? 0.88 : cool || warm ? 0.70 : 0.26 + rb * 0.26) * shimmer;
    const sizeJitter =
      1 + Math.sin(clockS * (3.1 + rb * 2.8) + phase) * (bright ? 0.09 : 0.025);
    const radius =
      (bright ? 1.05 + rb * 0.42 : cool || warm ? 0.72 + rb * 0.25 : 0.43 + rb * 0.33) *
      sizeJitter;

    let color = `rgba(234,241,248,${alpha})`;
    if (cool) color = `rgba(151,198,255,${alpha})`;
    else if (warm) color = `rgba(255,171,128,${alpha * 0.90})`;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (bright || cool || warm) {
      const flare = (bright ? 1.7 + rb * 0.75 : 1.0 + rb * 0.40) * sizeJitter;
      ctx.strokeStyle = cool
        ? `rgba(160,208,255,${alpha * 0.27})`
        : warm
          ? `rgba(255,190,154,${alpha * 0.22})`
          : `rgba(230,241,250,${alpha * 0.25})`;
      ctx.lineWidth = 0.32;
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

const SYNODIC_MONTH_MS =
  29.530588853 * 24 * 60 * 60 * 1000;

/*
 * Reference new moon: 2000-01-06 18:14 UTC.
 * This is a lightweight presentation model, not a navigation ephemeris.
 */
const MOON_PHASE_REFERENCE_MS =
  Date.UTC(2000, 0, 6, 18, 14, 0);

function wrapHours12(hours: number): number {
  let value = hours;

  while (value > 12) value -= 24;
  while (value < -12) value += 24;

  return value;
}

function moonPhase01(nowMs: number): number {
  const cycles =
    (nowMs - MOON_PHASE_REFERENCE_MS) /
    SYNODIC_MONTH_MS;

  return (
    (cycles % 1) +
    1
  ) % 1;
}

function localClockHour(date: Date): number {
  return (
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3600
  );
}

function localSkyDarkness01(hour: number): number {
  /*
   * Presentation-only daypart model:
   * night = strong moon contrast,
   * dawn/dusk = partial washout,
   * daytime = very faint.
   *
   * Entry-continent longitude is intentionally not part of v25.
   */
  if (hour >= 20 || hour < 4) return 1;

  if (hour < 7) {
    return mix(
      1,
      0.14,
      smoothstep(
        (hour - 4) / 3,
      ),
    );
  }

  if (hour < 17) return 0.08;

  return mix(
    0.14,
    1,
    smoothstep(
      (hour - 17) / 3,
    ),
  );
}

function drawAtmosphericMoon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  atmosphereSceneMix: number,
  nowMs: number,
): void {
  if (atmosphereSceneMix <= 0.02) return;

  const date = new Date(nowMs);
  const phase = moonPhase01(nowMs);
  const hour = localClockHour(date);

  /*
   * Approximate lunar transit:
   * new moon ~ noon,
   * first quarter ~ 18:00,
   * full moon ~ midnight,
   * last quarter ~ 06:00.
   *
   * This makes waning phases naturally appear in the early morning and
   * full phases naturally favor nighttime.
   */
  const transitHour =
    (
      12 +
      phase * 24
    ) % 24;

  const hourFromTransit =
    wrapHours12(
      hour - transitHour,
    );

  /*
   * ±6 hours from transit reaches the visual horizon.
   */
  const altitude01 =
    Math.max(
      0,
      Math.cos(
        (
          hourFromTransit /
          6
        ) *
          Math.PI /
          2,
      ),
    );

  if (altitude01 <= 0.01) return;

  const illuminated =
    (
      1 -
      Math.cos(
        phase *
          Math.PI *
          2,
      )
    ) /
    2;

  if (illuminated < 0.018) return;

  const darkness =
    localSkyDarkness01(hour);

  const daylightContrast =
    mix(
      0.12,
      1,
      darkness,
    );

  const illuminationGain =
    mix(
      0.40,
      1,
      Math.sqrt(illuminated),
    );

  const alpha =
    clamp01(
      atmosphereSceneMix *
        smoothstep(
          altitude01,
        ) *
        daylightContrast *
        illuminationGain,
    );

  if (alpha < 0.035) return;

  const transitOffset =
    clamp01(
      (
        hourFromTransit +
        6
      ) /
        12,
    );

  /*
   * Before transit the moon sits toward screen-right, after transit toward
   * screen-left. Higher altitude moves it upward.
   */
  const x =
    mix(
      w * 0.82,
      w * 0.18,
      transitOffset,
    );

  const y =
    mix(
      h * 0.43,
      h * 0.13,
      Math.sqrt(
        altitude01,
      ),
    );

  const r =
    Math.max(
      7.5,
      Math.min(
        18,
        Math.min(w, h) *
          0.026,
      ),
    );

  ctx.save();
  ctx.globalAlpha = alpha;

  const halo =
    ctx.createRadialGradient(
      x,
      y,
      r * 0.65,
      x,
      y,
      r * 3.8,
    );

  halo.addColorStop(
    0,
    "rgba(224,235,244,0.16)",
  );
  halo.addColorStop(
    0.42,
    "rgba(176,202,224,0.07)",
  );
  halo.addColorStop(
    1,
    "rgba(120,160,205,0)",
  );

  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(
    x,
    y,
    r * 3.8,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  const disc =
    ctx.createRadialGradient(
      x - r * 0.28,
      y - r * 0.32,
      r * 0.10,
      x,
      y,
      r,
    );

  disc.addColorStop(
    0,
    "rgba(245,245,236,0.98)",
  );
  disc.addColorStop(
    0.58,
    "rgba(211,214,207,0.96)",
  );
  disc.addColorStop(
    1,
    "rgba(151,158,157,0.96)",
  );

  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(
    x,
    y,
    r,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  /*
   * Deterministic crater marks keep the small disc from reading as a flat
   * white icon.
   */
  ctx.save();
  ctx.beginPath();
  ctx.arc(
    x,
    y,
    r,
    0,
    Math.PI * 2,
  );
  ctx.clip();

  for (
    let i = 0;
    i < 7;
    i += 1
  ) {
    const rx =
      hash01(
        0x6d6f6f6e,
        i * 13 + 1,
      );

    const ry =
      hash01(
        0x6d6f6f6e,
        i * 17 + 9,
      );

    const rr =
      hash01(
        0x6d6f6f6e,
        i * 19 + 5,
      );

    const craterX =
      x +
      (
        rx -
        0.5
      ) *
        r *
        1.25;

    const craterY =
      y +
      (
        ry -
        0.5
      ) *
        r *
        1.25;

    ctx.fillStyle =
      "rgba(92,99,101," +
      (
        0.08 +
        rr * 0.12
      ) +
      ")";

    ctx.beginPath();
    ctx.arc(
      craterX,
      craterY,
      r *
        (
          0.055 +
          rr *
            0.10
        ),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();

  /*
   * Phase shadow.
   * An equal-radius shadow disc creates readable crescent / quarter /
   * gibbous silhouettes at this intentionally tiny on-screen size.
   */
  const distanceToFull =
    phase <= 0.5
      ? phase / 0.5
      : (1 - phase) / 0.5;

  const waxing =
    phase < 0.5;

  const shadowOffset =
    r *
    2.15 *
    Math.pow(
      clamp01(
        distanceToFull,
      ),
      1.38,
    );

  const shadowX =
    x +
    (
      waxing
        ? -shadowOffset
        : shadowOffset
    );

  ctx.save();
  ctx.beginPath();
  ctx.arc(
    x,
    y,
    r,
    0,
    Math.PI * 2,
  );
  ctx.clip();

  ctx.fillStyle =
    darkness > 0.45
      ? "rgba(2,7,14,0.97)"
      : "rgba(16,31,48,0.90)";

  ctx.beginPath();
  ctx.arc(
    shadowX,
    y,
    r * 1.01,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle =
    "rgba(235,241,242,0.24)";

  ctx.lineWidth =
    Math.max(
      0.45,
      r * 0.055,
    );

  ctx.beginPath();
  ctx.arc(
    x,
    y,
    r,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

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

// One-time feathering prevents a rotated photograph's rectangular edge from
// cutting a black diagonal through the sky. The original pixels are genuine
// NASA ISS imagery; only the alpha at the perimeter is softened. Cache once,
// never allocate or filter a full-size image inside requestAnimationFrame.
const softEarthPhotoCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
function softlyMaskedEarthPhoto(source: HTMLImageElement): HTMLCanvasElement {
  const saved = softEarthPhotoCache.get(source);
  if (saved) return saved;
  const naturalW = Math.max(1, source.naturalWidth);
  const naturalH = Math.max(1, source.naturalHeight);
  const factor = Math.min(1, 1800 / Math.max(naturalW, naturalH));
  const w = Math.max(1, Math.round(naturalW * factor));
  const h = Math.max(1, Math.round(naturalH * factor));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  if (c) {
    c.drawImage(source, 0, 0, w, h);
    c.globalCompositeOperation = "destination-in";
    const fadeX = c.createLinearGradient(0, 0, w, 0);
    // DrawImage crops source to 7.5%..92.5%: alpha MUST be zero at
    // the actual crop edges, not at the edge of the uncropped photo.
    // Otherwise the cropped rectangle reappears as a black diagonal line.
    fadeX.addColorStop(0, "rgba(255,255,255,0)");
    fadeX.addColorStop(0.075, "rgba(255,255,255,0)");
    fadeX.addColorStop(0.27, "rgba(255,255,255,1)");
    fadeX.addColorStop(0.73, "rgba(255,255,255,1)");
    fadeX.addColorStop(0.925, "rgba(255,255,255,0)");
    fadeX.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = fadeX;
    c.fillRect(0, 0, w, h);
    const fadeY = c.createLinearGradient(0, 0, 0, h);
    fadeY.addColorStop(0, "rgba(255,255,255,0)");
    fadeY.addColorStop(0.075, "rgba(255,255,255,0)");
    fadeY.addColorStop(0.24, "rgba(255,255,255,1)");
    fadeY.addColorStop(0.76, "rgba(255,255,255,1)");
    fadeY.addColorStop(0.925, "rgba(255,255,255,0)");
    fadeY.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = fadeY;
    c.fillRect(0, 0, w, h);
  }
  softEarthPhotoCache.set(source, canvas);
  return canvas;
}

function drawAtmosphereVolume(
  ctx: CanvasRenderingContext2D,
  earth: HTMLImageElement | null,
  region: EarthPhotoCamera,
  w: number, h: number,
  atmosphereSceneMix: number,
  timeSinceEntryS: number,
  horizonAngle: number,
  surfacePhase: number,
  entrySteepness: number,
): void {
  if (atmosphereSceneMix <= 0.001) return;
  const alpha = clamp01(atmosphereSceneMix);
  const deep = smoothstep((timeSinceEntryS - 1.0) / 8.2);
  const reveal = smoothstep((timeSinceEntryS - 0.4) / 4.5);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#000208");
  sky.addColorStop(0.30, "#010610");
  sky.addColorStop(0.67, "#061b35");
  sky.addColorStop(1, "#194a6d");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  drawAtmosphericMoon(ctx, w, h, alpha, Date.now());

  ctx.save();
  ctx.translate(w * 0.5, h * 0.5);
  ctx.rotate(horizonAngle + region.bank);
  ctx.translate(-w * 0.5, -h * 0.5);
  const steep = clamp01(entrySteepness);
  const horizonY = mix(
    h * mix(0.75, 0.64, steep),
    h * mix(0.45, 0.36, steep), deep,
  ) + region.shift * h;
  if (earth && earth.naturalWidth > 0 && earth.naturalHeight > 0) {
    // Preserve actual photographic curvature, depth, clouds and coastlines.
    // Crops move within a single ISS exposure; no map stretched onto a disc.
    const softened = softlyMaskedEarthPhoto(earth);
    const iw = softened.width, ih = softened.height;
    const sx = iw * 0.075, sy = ih * 0.075;
    const sw = iw * 0.85, sh = ih * 0.85;
    const dw = Math.max(w * 1.55, h * 2.2) * (1 + region.zoom);
    const dh = dw * sh / sw;
    const limb = region.photoIndex === 0 ? 0.21 : 0.19;
    const travel = smoothstep(timeSinceEntryS / 9.5);
    const dx = (w - dw) * (0.5 + region.pan * 0.16 + (surfacePhase - 0.5) * 0.035) - travel * w * 0.022;
    const dy = horizonY - ((limb * ih - sy) / sh) * dh + travel * h * 0.018;
    ctx.save();
    ctx.globalAlpha = alpha * reveal;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Color is already present in the real photograph. Filtering an
    // oversized image every frame costs time during the squid animation.
    ctx.drawImage(softened, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();

    // A feathered, translucent blue atmosphere around the real
    // photographic limb. All stops fade to zero; no straight border.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * reveal;
    const haze = ctx.createLinearGradient(
      0, horizonY - h * 0.22, 0, horizonY + h * 0.18,
    );
    haze.addColorStop(0, "rgba(6,35,71,0)");
    haze.addColorStop(0.38, "rgba(23,80,148,0.025)");
    haze.addColorStop(0.55, "rgba(50,139,224,0.080)");
    haze.addColorStop(0.69, "rgba(62,154,228,0.045)");
    haze.addColorStop(1, "rgba(26,84,148,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(-w, horizonY - h * 0.22, w * 3, h * 0.40);
    ctx.restore();
  } else {
    // Safe photo-load fallback: a curved, illuminated blue ocean.
    // Never render the black margins of an Apollo photo as terrain.
    const r = Math.max(w, h) * mix(0.98, 1.32, deep);
    const ex = w * 0.5, ey = horizonY + r;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.clip();
    const sea = ctx.createLinearGradient(0, horizonY, 0, h);
    sea.addColorStop(0, "#6da3cc");
    sea.addColorStop(0.24, "#286c9b");
    sea.addColorStop(1, "#092b4c");
    ctx.fillStyle = sea;
    ctx.globalAlpha = alpha * mix(0.15, 1, reveal);
    ctx.fillRect(-w, horizonY, w * 3, h * 2);
    ctx.restore();
    const rim = ctx.createRadialGradient(ex, ey, r * 0.995, ex, ey, r * 1.02);
    rim.addColorStop(0, "rgba(80,162,245,0)");
    rim.addColorStop(0.52, "rgba(112,199,255,0.34)");
    rim.addColorStop(1, "rgba(95,167,246,0)");
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(ex, ey, r * 1.02, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Astronaut photos contain exposed black space. The photographic pixels
  // obscure the previously drawn stars, so restore only a sparse foreground
  // field high above the limb. Lower sky and ocean remain star-free.
  if (earth && timeSinceEntryS < 8) {
    const spaceStarAlpha = alpha *
      (1 - smoothstep((timeSinceEntryS - 4) / 4)) * 0.95;
    if (spaceStarAlpha > 0.001) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h * 0.34);
      ctx.clip();
      drawStars(ctx, w, h, surfacePhase, false, 0, spaceStarAlpha);
      ctx.restore();
    }
  }
}

function drawLiquidAlien(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
  stretch = 0,
): void {
  if (alpha <= 0.001) return;
  const time = typeof performance !== "undefined" ? performance.now() / 1000 : 0;
  const breathing = Math.sin(time * 0.92) * 0.023;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.10 + Math.sin(time * 0.47) * 0.035);
  ctx.globalAlpha = alpha;

  // Squid-like animal: a long pointed mantle, soft fins and six tapered
  // tentacles. The light belongs to its skin, not separate orbiting sprites.
  const drawTentacle = (i: number): void => {
    const side = (i - 2.5) / 2.5;
    const phase = time * (0.64 + i * 0.055) + i * 1.13;
    const swing = Math.sin(phase);
    const rootX = side * scale * 0.095;
    const rootY = -scale * 0.075;
    const tipX = scale * (side * 0.52 + swing * 0.105);
    const tipY = scale * (0.62 + (i % 3) * 0.085 + stretch * 0.48);
    const rootWidth = scale * (0.065 + (i % 3) * 0.007);
    const body = new Path2D();
    body.moveTo(rootX - rootWidth, rootY);
    body.bezierCurveTo(
      rootX - rootWidth * 1.2, scale * 0.23,
      tipX - scale * 0.08, scale * 0.42,
      tipX - scale * 0.008, tipY
    );
    body.quadraticCurveTo(tipX, tipY + scale * 0.01, tipX + scale * 0.008, tipY);
    body.bezierCurveTo(
      tipX + scale * 0.065, scale * 0.40,
      rootX + rootWidth * 1.1, scale * 0.12,
      rootX + rootWidth, rootY
    );
    body.closePath();
    const skin = ctx.createLinearGradient(
      rootX - rootWidth, scale * 0.04, rootX + rootWidth, scale * 0.39
    );
    skin.addColorStop(0, "#08261f");
    skin.addColorStop(0.25, "#1b6952");
    skin.addColorStop(0.53, "#4cc19a");
    skin.addColorStop(0.76, "#155943");
    skin.addColorStop(1, "#0a3736");
    ctx.fillStyle = skin;
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    // Small cyan/red photophores follow the limb's curve as it flexes.
    for (let k = 0; k < 7; k++) {
      const t = (k + 0.6) / 7.8;
      const cy = scale * (0.03 + t * (0.56 + (i % 3) * 0.09));
      const cx = rootX * (1 - t) + tipX * t - Math.sin(Math.PI * t) * scale * 0.026;
      const beat = Math.pow(0.5 + 0.5 * Math.sin(time * (2.9 + i * 0.12) + k * 0.88 + i * 2.3), 3);
      ctx.globalAlpha = alpha * (0.33 + 0.64 * beat);
      ctx.fillStyle = k % 4 === 0 ? "#ff8b9e" : "#72edff";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0.5, scale * 0.013 * (1 - t * 0.35)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = alpha;
  };
  for (const i of [0, 3, 5]) drawTentacle(i);

  // Asymmetric mantle fins add a biological outline, not an emoji shape.
  const leftFin = new Path2D();
  leftFin.moveTo(-scale * 0.13, -scale * 0.89);
  leftFin.bezierCurveTo(-scale * 0.46, -scale * 0.81, -scale * 0.55, -scale * 0.52, -scale * 0.31, -scale * 0.39);
  leftFin.quadraticCurveTo(-scale * 0.20, -scale * 0.65, -scale * 0.13, -scale * 0.89);
  ctx.fillStyle = "#115346";
  ctx.fill(leftFin);
  const rightFin = new Path2D();
  rightFin.moveTo(scale * 0.12, -scale * 0.94);
  rightFin.bezierCurveTo(scale * 0.43, -scale * 0.86, scale * 0.50, -scale * 0.54, scale * 0.29, -scale * 0.33);
  rightFin.quadraticCurveTo(scale * 0.18, -scale * 0.67, scale * 0.12, -scale * 0.94);
  const finShine = ctx.createLinearGradient(0, -scale, scale * 0.5, -scale * 0.45);
  finShine.addColorStop(0, "#0b3d35");
  finShine.addColorStop(0.52, "#57c7a7");
  finShine.addColorStop(1, "#0f635c");
  ctx.fillStyle = finShine;
  ctx.fill(rightFin);

  const mantle = new Path2D();
  mantle.moveTo(-scale * 0.012, -scale * (1.16 + breathing));
  mantle.bezierCurveTo(
    -scale * 0.21, -scale * 1.02, -scale * 0.34, -scale * 0.75,
    -scale * 0.32, -scale * 0.43
  );
  mantle.bezierCurveTo(
    -scale * 0.30, -scale * 0.17, -scale * 0.20, scale * 0.05,
    -scale * 0.080, scale * 0.075
  );
  mantle.quadraticCurveTo(0, scale * 0.11, scale * 0.10, scale * 0.045);
  mantle.bezierCurveTo(
    scale * 0.32, -scale * 0.15, scale * 0.39, -scale * 0.48,
    scale * 0.30, -scale * 0.78
  );
  mantle.quadraticCurveTo(
    scale * 0.18, -scale * 1.08,
    -scale * 0.012, -scale * (1.16 + breathing)
  );
  mantle.closePath();

  const mantleLight = ctx.createRadialGradient(
    -scale * 0.14, -scale * 0.82, scale * 0.035,
    scale * 0.18, -scale * 0.45, scale * 0.75
  );
  mantleLight.addColorStop(0, "#91e4bc");
  mantleLight.addColorStop(0.23, "#46aa82");
  mantleLight.addColorStop(0.49, "#24775f");
  mantleLight.addColorStop(0.74, "#12493f");
  mantleLight.addColorStop(1, "#071e20");
  ctx.fillStyle = mantleLight;
  ctx.fill(mantle);

  ctx.save();
  ctx.clip(mantle);
  const wet = ctx.createRadialGradient(
    -scale * 0.17, -scale * 0.82, 0,
    -scale * 0.17, -scale * 0.82, scale * 0.37
  );
  wet.addColorStop(0, "rgba(221,255,239,0.53)");
  wet.addColorStop(0.28, "rgba(110,236,187,0.20)");
  wet.addColorStop(1, "rgba(110,236,187,0)");
  ctx.fillStyle = wet;
  ctx.fillRect(-scale, -scale * 1.3, 2 * scale, scale * 1.6);

  // Distributed chromatophore-like blue / red points. Each tiny region
  // pulses with its own phase so no single on/off texture is visible.
  for (let row = 0; row < 15; row++) {
    const t = (row + 0.5) / 15;
    const yy = scale * (-1.12 + t * 1.15);
    const width = scale * (0.065 + 0.24 * Math.pow(Math.sin(Math.PI * t), 0.85));
    for (let col = -4; col <= 4; col++) {
      const grain = hash01(0x735ac1, row * 37 + col * 13);
      if (grain < 0.28) continue;
      const xx = (col / 4.7) * width + (hash01(0x925acf, row * 19 + col) - 0.5) * width * 0.14;
      const beat = Math.pow(
        0.5 + 0.5 * Math.sin(
          time * (2.4 + grain * 1.8) + row * 0.78 + col * 1.4
        ), 4
      );
      const brightness = 0.27 + beat * 0.70;
      const radius = Math.max(0.58, scale * (0.010 + grain * 0.006));
      ctx.globalAlpha = alpha * brightness;
      ctx.fillStyle = grain > 0.80 ? "#ff9aae" : grain > 0.55 ? "#a7fbff" : "#52c7ff";
      ctx.beginPath();
      ctx.arc(xx, yy, radius, 0, Math.PI * 2);
      ctx.fill();

      if (beat > 0.80 && row % 3 === 0) {
        const halo = ctx.createRadialGradient(xx, yy, 0, xx, yy, radius * 4);
        halo.addColorStop(0, "rgba(123,246,255,0.42)");
        halo.addColorStop(1, "rgba(123,246,255,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(xx, yy, radius * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha = alpha;
  // A small glossy eye on the front of the head, not two emoji dots.
  const eyeX = scale * 0.12;
  const eyeY = -scale * 0.105;
  ctx.fillStyle = "#0b1320";
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, scale * 0.055, scale * 0.067, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(225,252,255,0.88)";
  ctx.beginPath();
  ctx.arc(eyeX - scale * 0.016, eyeY - scale * 0.024, scale * 0.011, 0, Math.PI * 2);
  ctx.fill();

  for (const i of [1, 2, 4]) drawTentacle(i);
  ctx.restore();
}
function drawEscapeSkiff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
  tilt = -0.08,
  hatchClose01 = 0,
): void {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.globalAlpha = alpha;

  // Escape vessel formed from liquid: organic convex hull, not a flat disc.
  const keel = new Path2D();
  keel.moveTo(-scale * 0.73, -scale * 0.045);
  keel.bezierCurveTo(-scale * 0.69, scale * 0.13, -scale * 0.28, scale * 0.30, scale * 0.07, scale * 0.27);
  keel.bezierCurveTo(scale * 0.47, scale * 0.23, scale * 0.78, scale * 0.08, scale * 0.86, -scale * 0.055);
  keel.quadraticCurveTo(scale * 0.17, scale * 0.075, -scale * 0.73, -scale * 0.045);
  keel.closePath();
  const underside = ctx.createLinearGradient(0, -scale * 0.035, 0, scale * 0.33);
  underside.addColorStop(0, "#407bb3");
  underside.addColorStop(0.28, "#163b71");
  underside.addColorStop(0.64, "#0a173c");
  underside.addColorStop(1, "#020612");
  ctx.fillStyle = underside;
  ctx.fill(keel);

  const side = ctx.createLinearGradient(
    -scale * 0.50, scale * 0.01, scale * 0.55, scale * 0.20
  );
  side.addColorStop(0, "rgba(9,22,52,0.93)");
  side.addColorStop(0.48, "rgba(24,76,121,0.86)");
  side.addColorStop(0.78, "rgba(18,40,80,0.90)");
  side.addColorStop(1, "rgba(2,10,24,0.98)");
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(-scale * 0.70, -scale * 0.045);
  ctx.quadraticCurveTo(-scale * 0.20, scale * 0.20, scale * 0.20, scale * 0.17);
  ctx.quadraticCurveTo(scale * 0.56, scale * 0.115, scale * 0.84, -scale * 0.045);
  ctx.quadraticCurveTo(scale * 0.12, scale * 0.255, -scale * 0.70, -scale * 0.045);
  ctx.fill();

  const deck = new Path2D();
  deck.moveTo(scale * 0.87, -scale * 0.061);
  deck.bezierCurveTo(scale * 0.44, -scale * 0.31, -scale * 0.30, -scale * 0.35, -scale * 0.67, -scale * 0.108);
  deck.quadraticCurveTo(-scale * 0.83, -scale * 0.010, -scale * 0.62, scale * 0.065);
  deck.bezierCurveTo(-scale * 0.12, scale * 0.165, scale * 0.57, scale * 0.117, scale * 0.87, -scale * 0.061);
  deck.closePath();
  const enamel = ctx.createLinearGradient(
    -scale * 0.45, -scale * 0.24, scale * 0.41, scale * 0.19
  );
  enamel.addColorStop(0, "#040e29");
  enamel.addColorStop(0.19, "#243e86");
  enamel.addColorStop(0.34, "#557bc7");
  enamel.addColorStop(0.50, "#a2cde7");
  enamel.addColorStop(0.61, "#317bb2");
  enamel.addColorStop(0.79, "#263c86");
  enamel.addColorStop(1, "#060b26");
  ctx.fillStyle = enamel;
  ctx.fill(deck);

  ctx.save();
  ctx.clip(deck);
  const violet = ctx.createRadialGradient(
    -scale * 0.29, -scale * 0.08, 0,
    -scale * 0.29, -scale * 0.08, scale * 0.49
  );
  violet.addColorStop(0, "rgba(156,102,231,0.42)");
  violet.addColorStop(0.45, "rgba(98,104,206,0.18)");
  violet.addColorStop(1, "rgba(98,104,206,0)");
  ctx.fillStyle = violet;
  ctx.fillRect(-scale, -scale, scale * 2, scale * 2);
  const chrome = ctx.createRadialGradient(
    scale * 0.07, -scale * 0.23, 0,
    scale * 0.07, -scale * 0.23, scale * 0.48
  );
  chrome.addColorStop(0, "rgba(234,255,255,0.65)");
  chrome.addColorStop(0.36, "rgba(144,233,251,0.15)");
  chrome.addColorStop(1, "rgba(144,233,251,0)");
  ctx.fillStyle = chrome;
  ctx.fillRect(-scale, -scale, scale * 2, scale * 2);
  ctx.restore();

  const socket = ctx.createRadialGradient(
    scale * 0.12, -scale * 0.085, scale * 0.012,
    scale * 0.12, -scale * 0.085, scale * 0.245
  );
  socket.addColorStop(0, "#010510");
  socket.addColorStop(0.44, "#071527");
  socket.addColorStop(0.77, "#143557");
  socket.addColorStop(1, "#7cbbd2");
  ctx.fillStyle = socket;
  ctx.beginPath();
  ctx.ellipse(scale * 0.12, -scale * 0.07, scale * 0.194, scale * 0.093, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // An actual top-entry hatch rather than a painted black ornament.
  // The metal cover closes only once the last part of the squid is inside.
  if (hatchClose01 > 0.001) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(scale * 0.12, -scale * 0.07,
      scale * 0.194, scale * 0.093, -0.08, 0, Math.PI * 2);
    ctx.clip();
    const cover = ctx.createLinearGradient(
      -scale * 0.10, -scale * 0.21, scale * 0.39, scale * 0.05);
    cover.addColorStop(0, "#11183e");
    cover.addColorStop(0.34, "#5f65bb");
    cover.addColorStop(0.63, "#2b87a3");
    cover.addColorStop(1, "#091830");
    ctx.fillStyle = cover;
    // Slide as a curved metal iris across the oval rather than blinking shut.
    ctx.fillRect(-scale * 0.10 - (1 - hatchClose01) * scale * 0.42,
      -scale * 0.28, scale * 0.52, scale * 0.42);
    ctx.restore();
  }

  // Local chrome glimmer follows the edge and falls off naturally.
  const lip = ctx.createLinearGradient(-scale * 0.5, scale * 0.04, scale * 0.6, scale * 0.14);
  lip.addColorStop(0, "rgba(193,242,254,0)");
  lip.addColorStop(0.38, "rgba(213,251,255,0.48)");
  lip.addColorStop(0.78, "rgba(165,218,247,0.18)");
  lip.addColorStop(1, "rgba(165,218,247,0)");
  ctx.strokeStyle = lip;
  ctx.lineWidth = Math.max(0.5, scale * 0.016);
  ctx.beginPath();
  ctx.moveTo(-scale * 0.56, scale * 0.054);
  ctx.quadraticCurveTo(scale * 0.12, scale * 0.177, scale * 0.73, -scale * 0.034);
  ctx.stroke();
  ctx.restore();
}
function clipLandingCraftAboveWater(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  x: number,
  craftLength: number,
  landingAgeS: number,
): void {
  // Clip ONLY the craft while it is drawn. Never overpaint the WebGL sea.
  // The previous full-width foreground rectangle made the bottom of the
  // ocean look like a different, flat layer after splashdown.
  const immersion = smoothstep(landingAgeS / 1.6);
  const lineY = h * 0.78 - craftLength * (0.015 + immersion * 0.060);
  const t = typeof performance !== "undefined"
    ? performance.now() / 1000
    : landingAgeS;
  const waveAmp = Math.max(0.7, Math.min(w, h) * 0.0016);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, lineY);
  for (let i = 36; i >= 0; i--) {
    const px = w * i / 36;
    const local = Math.exp(-Math.pow((px - x) / (craftLength * 1.8), 2));
    const ripple = (
      Math.sin(px * 0.065 + t * 1.7) * 0.65 +
      Math.sin(px * 0.12 - t * 1.1) * 0.35
    ) * waveAmp * local;
    ctx.lineTo(px, lineY + ripple);
  }
  ctx.closePath();
  ctx.clip();
}


function drawAlienRaisedTentacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  side: -1 | 1,
  progress: number,
  targetX: number,
  targetY: number,
  alpha: number,
): { x: number; y: number } {
  const p = smoothstep(progress);
  const rootX = x + side * scale * 0.20;
  const rootY = y - scale * 0.13;
  const endX = mix(x + side * scale * 0.43, targetX, p);
  const endY = mix(y + scale * 0.20, targetY, p);
  const rootR = scale * 0.084;
  const bendX = rootX + (endX - rootX) * 0.40 - side * scale * 0.13;
  const bendY = rootY + (endY - rootY) * 0.38 + scale * 0.18;

  // Tapered soft arm, not a straight yellow line.
  const arm = new Path2D();
  arm.moveTo(rootX - rootR, rootY);
  arm.bezierCurveTo(
    rootX - rootR * 1.25, rootY - scale * 0.14 * p,
    bendX - rootR * 0.65, bendY,
    endX, endY
  );
  arm.bezierCurveTo(
    bendX + rootR * 0.36, bendY + scale * 0.045,
    rootX + rootR * 1.26, rootY + scale * 0.11,
    rootX + rootR, rootY
  );
  arm.closePath();
  ctx.save();
  ctx.globalAlpha = alpha;
  const skin = ctx.createLinearGradient(rootX - rootR, rootY, endX + rootR, endY);
  skin.addColorStop(0, "#0b2421");
  skin.addColorStop(0.20, "#235d4d");
  skin.addColorStop(0.53, "#69c8a8");
  skin.addColorStop(0.78, "#246e61");
  skin.addColorStop(1, "#123b43");
  ctx.fillStyle = skin;
  ctx.fill(arm);
  ctx.save();
  ctx.clip(arm);
  const wet = ctx.createRadialGradient(
    bendX - side * scale * 0.045, bendY - scale * 0.035, 0,
    bendX - side * scale * 0.045, bendY - scale * 0.035, scale * 0.23
  );
  wet.addColorStop(0, "rgba(255,200,219,0.43)");
  wet.addColorStop(0.30, "rgba(76,213,245,0.33)");
  wet.addColorStop(1, "rgba(76,213,245,0)");
  ctx.fillStyle = wet;
  ctx.fillRect(
    Math.min(rootX, endX) - scale,
    Math.min(rootY, endY) - scale,
    Math.abs(endX - rootX) + scale * 2,
    Math.abs(endY - rootY) + scale * 2
  );
  ctx.restore();
  ctx.restore();
  return { x: endX, y: endY };
}
function drawAlienFluidVehicleFormation(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  progress: number,
  alpha: number,
  scale: number,
  seed: number,
): void {
  const p =
    clamp01(
      progress,
    );

  if (
    p <= 0 ||
    alpha <= 0.001
  ) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation =
    "screen";
  ctx.globalAlpha =
    alpha;

  /*
   * The material leaves the raised tentacle as a thin liquid filament.
   * It thickens only close to the destination and then condenses into the
   * escape skiff.
   */
  const streamT =
    Math.min(
      1,
      p * 1.32,
    );

  const endX =
    mix(
      startX,
      targetX,
      streamT,
    );

  const endY =
    mix(
      startY,
      targetY,
      streamT,
    );

  const liquid =
    ctx.createLinearGradient(
      startX,
      startY,
      endX,
      endY,
    );

  liquid.addColorStop(
    0,
    "rgba(112,239,252,0.90)",
  );
  liquid.addColorStop(
    0.36,
    "rgba(83,205,219,0.58)",
  );
  liquid.addColorStop(
    0.72,
    "rgba(54,122,232,0.62)",
  );
  liquid.addColorStop(
    1,
    "rgba(185,235,255,0.22)",
  );

  ctx.strokeStyle =
    liquid;
  ctx.lineCap =
    "round";
  ctx.lineWidth =
    Math.max(
      1.0,
      scale *
        (
          0.030 +
          p * 0.018
        ),
    );
  ctx.shadowColor =
    "rgba(87,184,255,0.45)";
  ctx.shadowBlur =
    scale * 0.12;

  ctx.beginPath();
  ctx.moveTo(
    startX,
    startY,
  );
  ctx.bezierCurveTo(
    mix(
      startX,
      targetX,
      0.30,
    ),
    startY -
      scale *
        0.32,
    mix(
      startX,
      targetX,
      0.72,
    ),
    targetY -
      scale *
        0.18,
    endX,
    endY,
  );
  ctx.stroke();

  for (
    let i = 0;
    i < 12;
    i++
  ) {
    const a =
      hash01(
        seed ^
          0x4c71b2a9,
        i * 17 + 3,
      );

    const b =
      hash01(
        seed ^
          0x173adfe1,
        i * 29 + 11,
      );

    const t =
      clamp01(
        streamT -
          a * 0.28,
      );

    if (
      t <= 0 ||
      t >= 1
    ) {
      continue;
    }

    const px =
      mix(
        startX,
        targetX,
        t,
      ) +
      Math.sin(
        t *
          Math.PI *
          3 +
        b * 6.28,
      ) *
        scale *
        0.035;

    const py =
      mix(
        startY,
        targetY,
        t,
      ) -
      Math.sin(
        t *
          Math.PI,
      ) *
        scale *
        (
          0.14 +
          b * 0.12
        );

    const rr =
      scale *
      (
        0.010 +
        b * 0.015
      );

    ctx.fillStyle =
      b > 0.5
        ? "rgba(115,215,237,0.68)"
        : "rgba(255,229,70,0.70)";
    ctx.beginPath();
    ctx.arc(
      px,
      py,
      rr,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawCraftAbsorption(
  ctx: CanvasRenderingContext2D,
  craftX: number,
  craftY: number,
  targetX: number,
  targetY: number,
  scale: number,
  progress: number,
  seed: number,
): void {
  const p =
    smoothstep(
      progress,
    );

  if (
    p <= 0
  ) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation =
    "screen";

  const halo =
    ctx.createRadialGradient(
      craftX,
      craftY,
      0,
      craftX,
      craftY,
      scale *
        (
          0.34 +
          p * 0.26
        ),
    );

  halo.addColorStop(
    0,
    "rgba(132,214,255," +
      (
        0.18 +
        p * 0.24
      ) +
      ")",
  );
  halo.addColorStop(
    0.52,
    "rgba(50,116,226," +
      (
        0.10 +
        p * 0.16
      ) +
      ")",
  );
  halo.addColorStop(
    1,
    "rgba(20,75,190,0)",
  );

  ctx.fillStyle =
    halo;
  ctx.beginPath();
  ctx.arc(
    craftX,
    craftY,
    scale *
      (
        0.34 +
        p * 0.26
      ),
    0,
    Math.PI * 2,
  );
  ctx.fill();

  for (
    let i = 0;
    i < 24;
    i++
  ) {
    const a =
      hash01(
        seed ^
          0x64da9b13,
        i * 23 + 5,
      );

    const b =
      hash01(
        seed ^
          0xb1492e71,
        i * 37 + 13,
      );

    const local =
      clamp01(
        p *
          (
            1.12 +
            b * 0.34
          ) -
        a * 0.42,
      );

    if (
      local <= 0
    ) {
      continue;
    }

    const sx =
      craftX +
      (
        a -
        0.5
      ) *
        scale *
        0.76;

    const sy =
      craftY +
      (
        b -
        0.5
      ) *
        scale *
        0.46;

    const px =
      mix(
        sx,
        targetX,
        local,
      ) +
      Math.sin(
        local *
          Math.PI *
          2 +
        i,
      ) *
        scale *
        0.035 *
        (
          1 -
          local
        );

    const py =
      mix(
        sy,
        targetY,
        local,
      ) -
      Math.sin(
        local *
          Math.PI,
      ) *
        scale *
        0.16;

    const rr =
      scale *
      (
        0.008 +
        b * 0.014
      ) *
      (
        1 -
        local * 0.60
      );

    ctx.fillStyle =
      a > 0.66
        ? "rgba(217,238,244,0.72)"
        : b > 0.42
          ? "rgba(39,128,239,0.70)"
          : "rgba(47,190,155,0.64)";

    ctx.beginPath();
    ctx.arc(
      px,
      py,
      rr,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}



/**
 * Recover the original ship with six separate organic filaments flowing
 * INTO the raised tentacles. All geometry derives from playback time and the
 * current ocean pose; no timers, particle state or white laser beams.
 */
function drawSalvageFilaments(
  ctx: CanvasRenderingContext2D,
  craftX: number,
  craftY: number,
  leftHand: { x: number; y: number },
  rightHand: { x: number; y: number },
  progress: number,
  ageS: number,
  minDim: number,
  seed: number,
): void {
  const p = clamp01(progress);
  const grow = smoothstep(p / 0.18);
  const fade = 1 - smoothstep((p - 0.79) / 0.21);
  const strength = grow * fade;
  if (strength <= 0.002) return;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const jitter = hash01(seed ^ 0x174b2ca, i * 17 + 3);
    const fromX = craftX + (i - 2.5) * minDim * 0.009;
    const fromY = craftY - minDim * (0.017 + jitter * 0.018);
    const hand = i % 2 === 0 ? leftHand : rightHand;
    const toX = hand.x + (i % 3 - 1) * minDim * 0.0025;
    const toY = hand.y + (jitter - 0.5) * minDim * 0.004;
    const oscillation = Math.sin(ageS * 1.4 + i * 1.73) * minDim * 0.011;
    const midX = (fromX + toX) * 0.5;
    const midY = Math.min(fromY, toY) - minDim * (0.055 + jitter * 0.05);
    const c1x = mix(fromX, midX, 0.56) + oscillation;
    const c1y = mix(fromY, midY, 0.65);
    const c2x = mix(toX, midX, 0.50) - oscillation;
    const c2y = mix(toY, midY, 0.65);

    const point = (t: number): { x: number; y: number } => {
      const inv = 1 - t;
      return {
        x: inv * inv * inv * fromX +
          3 * inv * inv * t * c1x +
          3 * inv * t * t * c2x + t * t * t * toX,
        y: inv * inv * inv * fromY +
          3 * inv * inv * t * c1y +
          3 * inv * t * t * c2y + t * t * t * toY,
      };
    };

    ctx.beginPath();
    const start = point(0);
    ctx.moveTo(start.x, start.y);
    for (let step = 1; step <= 15; step++) {
      const pos = point((step / 15) * grow);
      ctx.lineTo(pos.x, pos.y);
    }
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(186,239,245,${0.55 * strength})`
      : i % 3 === 1
        ? `rgba(92,210,190,${0.48 * strength})`
        : `rgba(115,171,237,${0.40 * strength})`;
    ctx.lineWidth = Math.max(0.65, minDim * (0.0011 + jitter * 0.0006));
    ctx.stroke();

    // Two tiny liquid beads per thread travel towards the raised hand.
    for (let k = 0; k < 2; k++) {
      const travel = (ageS * 0.32 + i * 0.21 + k * 0.42) % 1;
      if (travel > grow) continue;
      const dot = point(travel);
      ctx.fillStyle = `rgba(194,250,237,${0.75 * strength})`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, Math.max(0.55, minDim * 0.0018),
        0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRearCraftHatch(
  ctx: CanvasRenderingContext2D,
  pose: { x: number; y: number; angle: number },
  craftLength: number,
  open01: number,
): void {
  if (open01 < 0.001) return;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  // The craft nose points along +X; the exit is set into the tail at -X.
  const hx = -craftLength * 0.37;
  const rx = craftLength * 0.18;
  const ry = craftLength * 0.102;
  ctx.fillStyle = "rgba(2,7,19,0.95)";
  ctx.beginPath();
  ctx.ellipse(hx, 0, rx * open01, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(174,224,244,0.65)";
  ctx.lineWidth = Math.max(0.5, craftLength * 0.013);
  ctx.stroke();
  ctx.save();
  ctx.translate(hx, -ry);
  ctx.rotate(-open01 * 0.85);
  const metal = ctx.createLinearGradient(-rx, -ry, rx, ry);
  metal.addColorStop(0, "#231444");
  metal.addColorStop(0.54, "#745ba5");
  metal.addColorStop(1, "#132c49");
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.ellipse(0, -ry * 0.32, rx, ry * 0.82, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawStage1ClearSequence(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSinceVisualS: number,
  seed: number,
  landedCraftPose: { x: number; y: number; angle: number },
): void {
  const splashStartS = STAGE1_SPLASH_S;

  if (
    timeSinceVisualS <
    splashStartS
  ) {
    return;
  }

  const clockS =
    typeof performance !== "undefined"
      ? performance.now() / 1000
      : timeSinceVisualS;

  const minDim =
    Math.min(w, h);

  const craftX =
    w * 0.48;

  const waterY =
    h * 0.78;

  const splashAge =
    Math.max(
      0,
      timeSinceVisualS -
        splashStartS,
    );

  /*
   * Impact crown + sheets + droplets.
   *
   * The old splash was too evenly distributed. This version deliberately
   * separates the impact into unequal left/right water sheets plus many
   * droplets with different launch delays, heights and widths.
   */
  const impactPulse =
    1 -
    smoothstep(
      splashAge /
        2.25,
    );

  if (
    impactPulse >
    0.001
  ) {
    ctx.save();
    ctx.globalCompositeOperation =
      "screen";

    const impactSeed =
      seed ^
      0x6ab3d91f;

    const sheetLife =
      clamp01(
        splashAge /
          1.75,
      );

    const sheetFade =
      1 -
      smoothstep(
        (
          splashAge -
          0.72
        ) /
          1.55,
      );

    /*
     * Soft impact crown.
     *
     * Do not draw filled polygonal water sheets: on a phone they read as
     * transparent triangles. Build the crown from overlapping translucent
     * spray masses instead.
     */
    for (
      let sideIndex = 0;
      sideIndex < 2;
      sideIndex++
    ) {
      const side =
        sideIndex === 0
          ? -1
          : 1;

      const sideBias =
        hash01(
          impactSeed ^
            0x51e2a77b,
          29 +
            sideIndex * 47,
        );

      for (
        let plume = 0;
        plume < 11;
        plume++
      ) {
        const a =
          hash01(
            impactSeed ^
              0x2468b9d1,
            sideIndex * 101 +
              plume * 17 +
              3,
          );

        const b =
          hash01(
            impactSeed ^
              0x71c3e05b,
            sideIndex * 127 +
              plume * 23 +
              7,
          );

        const c =
          hash01(
            impactSeed ^
              0x9d12ab43,
            sideIndex * 149 +
              plume * 31 +
              11,
          );

        const plumeDelay =
          plume *
          (
            0.018 +
            a * 0.026
          );

        const plumeAge =
          Math.max(
            0,
            splashAge -
              plumeDelay,
          );

        if (
          plumeAge <= 0
        ) {
          continue;
        }

        const plumeLife =
          0.70 +
          b * 0.85;

        const t =
          clamp01(
            plumeAge /
              plumeLife,
          );

        if (
          t >= 1
        ) {
          continue;
        }

        const rise =
          minDim *
          (
            0.020 +
            (
              0.13 +
              c * 0.15
            ) *
              Math.sin(
                Math.PI *
                  Math.min(
                    1,
                    t * 1.05,
                  ),
              )
          );

        const outward =
          minDim *
          (
            0.014 +
            (
              0.040 +
              sideBias * 0.080 +
              b * 0.065
            ) *
              t
          );

        const px =
          craftX +
          side *
            outward +
          Math.sin(
            clockS * 0.61 +
            plume * 1.7
          ) *
            minDim *
            0.004;

        const py =
          waterY -
          rise +
          minDim *
            0.018 *
            t *
            t;

        const rx =
          minDim *
          (
            0.008 +
            b * 0.012 +
            t * 0.010
          );

        const ry =
          rx *
          (
            1.6 +
            a * 1.3
          );

        const alpha =
          (
            1 -
            smoothstep(
              (
                t -
                0.42
              ) /
                0.58,
            )
          ) *
          (
            0.12 +
            c * 0.22
          ) *
          impactPulse;

        if (
          alpha <= 0.002
        ) {
          continue;
        }

        const plumeGradient =
          ctx.createRadialGradient(
            px,
            py,
            0,
            px,
            py,
            ry,
          );

        plumeGradient.addColorStop(
          0,
          "rgba(246,252,255," +
            alpha +
            ")",
        );
        plumeGradient.addColorStop(
          0.36,
          "rgba(209,237,249," +
            alpha * 0.68 +
            ")",
        );
        plumeGradient.addColorStop(
          0.74,
          "rgba(160,210,232," +
            alpha * 0.22 +
            ")",
        );
        plumeGradient.addColorStop(
          1,
          "rgba(142,197,222,0)",
        );

        ctx.fillStyle =
          plumeGradient;

        ctx.beginPath();
        // The radial fade supplies spray volume; no visible spinning oval.
        ctx.arc(
          px,
          py,
          ry * 0.84,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    /*
     * Irregular droplets: more numerous than before, but not uniformly
     * spaced. Gravity brings them back into the sea.
     */
    for (
      let i = 0;
      i < 92;
      i++
    ) {
      const a =
        hash01(
          impactSeed ^
            0x5eaf13,
          i * 19 + 3,
        );

      const b =
        hash01(
          impactSeed ^
            0x91c33d,
          i * 29 + 7,
        );

      const c =
        hash01(
          impactSeed ^
            0x62a17b,
          i * 37 + 11,
        );

      const d =
        hash01(
          impactSeed ^
            0x2139c5a1,
          i * 43 + 17,
        );

      const launchDelay =
        c *
        (
          0.16 +
          d * 0.46
        );

      const launchAge =
        Math.max(
          0,
          splashAge -
            launchDelay,
        );

      if (
        launchAge <= 0
      ) {
        continue;
      }

      const side =
        a < 0.47
          ? -1
          : 1;

      const sideSpeed =
        minDim *
        (
          0.045 +
          Math.pow(
            b,
            0.62,
          ) *
            0.25
        ) *
        side;

      const riseSpeed =
        minDim *
        (
          0.13 +
          Math.pow(
            d,
            0.72,
          ) *
            0.31
        );

      const px =
        craftX +
        sideSpeed *
          launchAge +
        Math.sin(
          i * 1.91 +
          clockS * 0.43,
        ) *
          minDim *
          0.004;

      const py =
        waterY -
        riseSpeed *
          launchAge +
        minDim *
          (
            0.090 +
            c * 0.025
          ) *
          launchAge *
          launchAge;

      const lifeFade =
        1 -
        smoothstep(
          (
            launchAge -
            (
              0.52 +
              b * 0.62
            )
          ) /
            (
              0.72 +
              d * 0.42
            ),
        );

      if (
        lifeFade <= 0.002
      ) {
        continue;
      }

      const rr =
        minDim *
        (
          0.0014 +
          b * 0.0062
        );

      ctx.globalAlpha =
        impactPulse *
        lifeFade *
        (
          0.17 +
          d * 0.73
        );

      const drop =
        ctx.createRadialGradient(
          px,
          py,
          0,
          px,
          py,
          rr * 2.2,
        );

      drop.addColorStop(
        0,
        "rgba(255,255,255,0.96)",
      );
      drop.addColorStop(
        0.44,
        "rgba(218,242,252,0.66)",
      );
      drop.addColorStop(
        1,
        "rgba(164,210,232,0)",
      );

      ctx.fillStyle =
        drop;

      /*
       * A water droplet should read as a bead with motion, not as a rotating
       * capsule-shaped oval.
       */
      ctx.beginPath();
      ctx.arc(
        px,
        py,
        rr *
          (
            0.52 +
            c * 0.48
          ),
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.strokeStyle =
        "rgba(214,240,250," +
        (
          0.10 +
          d * 0.22
        ) *
          impactPulse *
          lifeFade +
        ")";
      ctx.lineWidth =
        Math.max(
          0.55,
          rr * 0.34,
        );
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(
        px -
          side *
            rr *
            (
              0.8 +
              b * 1.2
            ),
        py +
          rr *
            (
              0.8 +
              c
            ),
      );
      ctx.lineTo(
        px,
        py,
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  /*
   * High-temperature splash aftermath.
   * Use soft displaced water and broken foam, never geometric ring lines.
   */
  ctx.save();
  ctx.globalCompositeOperation =
    "screen";

  const wakeAge =
    Math.max(
      0,
      splashAge,
    );

  for (
    let i = 0;
    i < 24;
    i++
  ) {
    const a =
      hash01(
        0x8d12ac,
        i * 31 + 7,
      );
    const b =
      hash01(
        0x51f3a9,
        i * 17 + 5,
      );
    const c =
      hash01(
        0x7135de,
        i * 23 + 11,
      );

    const angle =
      a *
      Math.PI *
      2 +
      Math.sin(
        clockS * 0.21 +
        i,
      ) *
        0.035;

    const radius =
      minDim *
      (
        0.030 +
        b * 0.15 +
        Math.min(
          1.4,
          wakeAge,
        ) *
          0.035
      );

    const px =
      craftX +
      Math.cos(angle) *
        radius;

    const py =
      waterY +
      minDim * 0.016 +
      Math.sin(angle) *
        radius *
        0.22;

    const size =
      minDim *
      (
        0.0025 +
        c * 0.0075
      );

    ctx.globalAlpha =
      (
        0.07 +
        b * 0.16
      ) *
      (
        1 -
        smoothstep(
          (
            wakeAge -
            3.5
          ) /
            5.5,
        )
      );

    const foam =
      ctx.createRadialGradient(
        px,
        py,
        0,
        px,
        py,
        size * 2.2,
      );

    foam.addColorStop(
      0,
      "rgba(245,252,255,0.70)",
    );
    foam.addColorStop(
      0.34,
      "rgba(196,232,245,0.28)",
    );
    foam.addColorStop(
      1,
      "rgba(160,210,232,0)",
    );

    ctx.fillStyle = foam;
    ctx.beginPath();
    // Circular microfoam with a soft edge, not a tilted white plate.
    ctx.arc(
      px,
      py,
      size * 2.2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  /*
   * Long-lived steam from a still-hot hull.
   *
   * Steam now continues almost through the CLEAR hold. New wisps start at
   * different times, rise at different rates and gradually thin out instead
   * of disappearing together.
   */
  const steamIn =
    smoothstep(
      splashAge / 0.38,
    );

  // The hot hull steams during the immediate escape, but cools before
  // the long two-handed salvage. Stop 24 radial gradients per frame once
  // that vapor is no longer visually useful.
  const steamEnvelope =
    steamIn *
    (
      1 -
      smoothstep(
        (
          splashAge -
          5.5
        ) /
          6.5,
      )
    );

  if (
    steamEnvelope >
    0.001
  ) {
    ctx.save();
    ctx.globalCompositeOperation =
      "screen";

    const steamSeed =
      seed ^
      0x17d4c3ab;

    for (
      let i = 0;
      i < 24;
      i++
    ) {
      const a =
        hash01(
          steamSeed,
          i * 19 + 3,
        );

      const b =
        hash01(
          steamSeed ^
            0x3f9d27,
          i * 29 + 7,
        );

      const c =
        hash01(
          steamSeed ^
            0x1b7a41,
          i * 37 + 13,
        );

      const d =
        hash01(
          steamSeed ^
            0x55c401e9,
          i * 43 + 23,
        );

      /*
       * Some vapor appears immediately, some continues to be produced several
       * seconds later while the hull is still hot.
       */
      const delay =
        c *
        (
          0.70 +
          d * 6.1
        );

      const age =
        splashAge -
          delay;

      if (
        age <= 0
      ) {
        continue;
      }

      const lifetime =
        7.0 +
        b * 9.0;

      const life =
        clamp01(
          age /
            lifetime,
        );

      if (
        life >= 1
      ) {
        continue;
      }

      const fadeIn =
        smoothstep(
          life / 0.12,
        );

      const fadeOut =
        1 -
        smoothstep(
          (
            life -
            0.46
          ) /
            0.54,
        );

      const localAlpha =
        steamEnvelope *
        fadeIn *
        fadeOut;

      if (
        localAlpha <= 0.001
      ) {
        continue;
      }

      const sideBias =
        (
          a -
          0.5
        ) *
        minDim *
        (
          0.020 +
          d * 0.060
        );

      const windDrift =
        (
          a -
          0.5
        ) *
        minDim *
        life *
        (
          0.045 +
          b * 0.055
        );

      const curl =
        Math.sin(
          clockS *
            (
              0.28 +
              b * 0.24
            ) +
          i * 1.37
        ) *
        minDim *
        (
          0.007 +
          life * 0.014
        );

      const px =
        craftX +
        sideBias +
        windDrift +
        curl;

      const py =
        waterY -
        minDim *
          (
            0.018 +
            life *
              (
                0.13 +
                d * 0.16
              )
          );

      const rx =
        minDim *
        (
          0.012 +
          b * 0.018 +
          life * 0.050
        );

      const ry =
        rx *
        (
          1.15 +
          life * 2.15 +
          c * 0.35
        );

      ctx.save();

      // The wisp already has four soft radial-gradient color stops.
      // Avoid a GPU/CPU blur filter on EACH wisp EVERY frame.

      const wisp =
        ctx.createRadialGradient(
          px,
          py,
          rx * 0.04,
          px,
          py,
          ry,
        );

      const coreAlpha =
        (
          0.045 +
          b * 0.10
        ) *
        localAlpha;

      wisp.addColorStop(
        0,
        "rgba(248,251,252," +
          coreAlpha +
          ")",
      );

      wisp.addColorStop(
        0.28,
        "rgba(220,231,236," +
          coreAlpha * 0.72 +
          ")",
      );

      wisp.addColorStop(
        0.62,
        "rgba(175,195,205," +
          coreAlpha * 0.34 +
          ")",
      );

      wisp.addColorStop(
        1,
        "rgba(130,154,166,0)",
      );

      ctx.fillStyle =
        wisp;

      ctx.beginPath();

      ctx.ellipse(
        px,
        py,
        rx *
          (
            0.82 +
            c * 0.35
          ),
        ry,
        (
          a -
          0.5
        ) *
          0.34,
        0,
        Math.PI * 2,
      );

      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();

  /*
   * Foam fragments stay near the capsule and drift with the surface.
   * Keep this state isolated from the following alien/skiff animation.
   */
  ctx.save();
  for (
    let i = 0;
    i < 22;
    i++
  ) {
    const a =
      hash01(
        seed ^ 0x7814ef,
        i * 13 + 1,
      );

    const b =
      hash01(
        seed ^ 0x5ac83d,
        i * 23 + 9,
      );

    // Fixed seeded direction: the bubbles drift, they do not orbit.
    const angle =
      a *
      Math.PI *
      2;

    const radius =
      minDim *
      (
        0.035 +
        b * 0.11
      );

    const fx =
      craftX +
      Math.cos(angle) *
        radius;

    const fy =
      waterY +
      minDim * 0.015 +
      Math.sin(angle) *
        radius * 0.23;

    const fr =
      minDim *
      (
        0.002 +
        b * 0.006
      );

    ctx.globalAlpha =
      (
        0.09 +
        b * 0.15
      ) *
      (
        1 -
        smoothstep(
          (splashAge - 16) / 9,
        )
      );

    ctx.fillStyle =
      "rgba(235,250,255,0.85)";

    /*
     * Foam is a broken cluster of bubbles, not a spinning oval.
     */
    for (
      let bubble = 0;
      bubble < 4;
      bubble++
    ) {
      const bubbleSeed =
        hash01(
          seed ^
            0x42f9ac1d,
          i * 71 +
            bubble * 13 +
            5,
        );

      const bubbleAngle =
        bubbleSeed *
        Math.PI *
        2;

      const bubbleRadius =
        fr *
        (
          0.48 +
          bubbleSeed * 0.72
        );

      const bx =
        fx +
        Math.cos(
          bubbleAngle,
        ) *
          fr *
          (
            0.65 +
            bubble * 0.42
          );

      const by =
        fy +
        Math.sin(
          bubbleAngle,
        ) *
          fr *
          (
            0.20 +
            bubble * 0.12
          );

      ctx.beginPath();
      ctx.arc(
        bx,
        by,
        bubbleRadius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  ctx.restore();

  /*
   * Stage 1 epilogue:
   *  1) alien rises from the half-submerged craft;
   *  2) one tentacle points and ejects a thin liquid filament;
   *  3) the filament condenses into the small escape skiff;
   *  4) the alien boards; both arms draw in the original ship through threads;
   *  5) it enters the skiff, seals the hatch and departs.
   *
   * Everything stays in the same ocean shot; there is no cut to a still image.
   */
  // Stage 1 escape is playback driven: the squid rises, creates the skiff,
  // boards its deck, lifts both arms and draws in the original craft.
  const hatchOpen = smoothstep((splashAge - 1.2) / 1.4);
  const alienRise = smoothstep((splashAge - 2.6) / 2.6);
  const climbCraft = smoothstep((splashAge - 5.2) / 1.6);
  const pointGesture = smoothstep((splashAge - 6.8) / 0.80) *
    (1 - smoothstep((splashAge - 9.3) / 0.50));
  const vehicleFormation = smoothstep((splashAge - 6.8) / 3.0);
  // The old 1s move covered most of the distance to the skiff. A longer
  // eased approach prevents the rider appearing to teleport when FPS dips.
  const boardApproach = smoothstep((splashAge - 9.8) /
    (STAGE1_ABSORB_START_S - 9.8));
  const absorbT = smoothstep((splashAge - STAGE1_ABSORB_START_S) /
    (STAGE1_ABSORB_END_S - STAGE1_ABSORB_START_S));
  // The squid stands ON the skiff and visibly recovers the original hull.
  // Afterwards, feet and then the mantle descend through the black hatch.
  const enterT = smoothstep((splashAge - STAGE1_ABSORB_END_S) / 1.0);
  const hatchClose = smoothstep((splashAge - (STAGE1_BOARD_COMPLETE_S - 0.5)) / 0.5);

  // Left near the screen edge, then deliberate travel to its midpoint.
  // The final 1.4s carries the EMPTY exterior rapidly beyond the right edge.
  const leftT = smoothstep((splashAge - STAGE1_BOARD_COMPLETE_S) /
    (STAGE1_CLEAR_HOLD_END_S - STAGE1_BOARD_COMPLETE_S));
  const glideT = smoothstep((splashAge - STAGE1_CLEAR_HOLD_END_S) /
    (STAGE1_GLIDE_END_S - STAGE1_CLEAR_HOLD_END_S));
  const dashT = clamp01((splashAge - STAGE1_GLIDE_END_S) /
    (STAGE1_ESCAPE_EXIT_S - STAGE1_GLIDE_END_S));
  const dash = dashT * dashT * dashT;
  const minSide = Math.min(w, h);
  const landedTilt = Math.max(-0.16, Math.min(
    0.16, (landedCraftPose.angle - Math.PI / 2) * 0.80,
  ));
  const skiffRoll = mix(-0.08, -0.21, leftT) +
    glideT * 0.14 - dash * 0.18;
  const parentTilt = mix(landedTilt, skiffRoll, boardApproach);
  const flightScale = mix(1, 0.82, dash);
  const alienScale = minSide * 0.034;

  // Tail hatch uses the actual floating craft pose, including wave bob/roll.
  const hatchX = landedCraftPose.x -
    Math.cos(landedCraftPose.angle) * minSide * 0.041;
  const hatchY = landedCraftPose.y -
    Math.sin(landedCraftPose.angle) * minSide * 0.041;
  const emergeX = hatchX + Math.sin(landedTilt) * minSide * 0.015;
  const emergeY = hatchY + minSide * mix(0.036, -0.028, alienRise);
  const topX = landedCraftPose.x + minSide * 0.028;
  const topY = landedCraftPose.y - minSide * 0.060;
  const sourceAlienX = mix(emergeX, topX, climbCraft);
  const sourceAlienY = mix(emergeY, topY, climbCraft);

  const skiffRestX = craftX + minSide * 0.245;
  const skiffRestY = waterY - minSide * 0.038 +
    Math.sin(splashAge * 2.2 + seed * 0.002) * minSide * 0.004;
  const leftX = Math.max(minSide * 0.14, w * 0.10);
  const middleX = w * 0.50;
  const glideX = mix(mix(skiffRestX, leftX, leftT), middleX, glideT);
  const exitTravel = Math.max(w * 1.10, w - middleX + minSide * 0.44);
  const skiffX = glideX + dash * exitTravel;
  const skiffY = skiffRestY - minSide * 0.03 * leftT +
    minSide * 0.02 * glideT - h * 0.04 * dash;
  const skiffScale = minSide * mix(0.030, 0.075, vehicleFormation) *
    mix(1, 0.82, dash);
  const seatX = skiffX + Math.cos(skiffRoll) * skiffScale * 0.12;
  const entranceY = skiffY - minSide * 0.063;
  const boardX = mix(sourceAlienX, seatX, boardApproach);
  // Feet enter first; only afterwards does the pointed mantle pass the lip.
  const boardingHop = Math.sin(boardApproach * Math.PI) * minSide * 0.020;
  const boardY = mix(sourceAlienY, entranceY, boardApproach) - boardingHop +
    enterT * minSide * 0.138;
  // The actual opening clips the body; no fading or shrinking to disappear.
  const alienAlpha = alienRise;
  const raisedTentacle = (
    side: -1 | 1, progress: number, targetX: number, targetY: number,
  ): { x: number; y: number } => {
    const cos = Math.cos(parentTilt), sin = Math.sin(parentTilt);
    const dx = targetX - boardX, dy = targetY - boardY;
    ctx.save();
    ctx.translate(boardX, boardY);
    ctx.rotate(parentTilt);
    const tip = drawAlienRaisedTentacle(
      ctx, 0, 0, alienScale, side, progress,
      dx * cos + dy * sin, -dx * sin + dy * cos, alienAlpha,
    );
    ctx.restore();
    return { x: boardX + tip.x * cos - tip.y * sin,
      y: boardY + tip.x * sin + tip.y * cos };
  };

  // The rear hatch opening and two soft, gripping limbs are connected to
  // the floating craft. Nothing appears independently in midair.
  if (hatchOpen > 0 && alienRise > 0 && climbCraft < 0.98) {
    ctx.save();
    ctx.strokeStyle = "rgba(105,222,168," +
      (0.85 * alienRise * (1 - climbCraft)) + ")";
    ctx.lineWidth = Math.max(0.9, minDim * 0.0038);
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(boardX + side * alienScale * 0.12, boardY + alienScale * 0.15);
      ctx.quadraticCurveTo(
        hatchX + side * minDim * 0.028, hatchY - minDim * 0.011,
        hatchX + side * minDim * 0.012, hatchY + minDim * 0.004,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  // At the rear hatch the creature is occluded by the solid fuselage.
  // At the hovercraft, only the portion above the black entrance is visible:
  // feet first, then mantle, so boarding is not an opacity trick.
  if (alienAlpha > 0.001 && enterT < 1) {
    ctx.save();
    if (climbCraft < 0.001) {
      ctx.beginPath();
      ctx.rect(-w, -h, w * 3, h + hatchY);
      ctx.clip();
    } else if (enterT > 0.001) {
      // Keep the entire creature visible ON the deck during the salvage
      // gesture. Clip only when its feet actually descend into the opening.
      const hatchLipY = skiffY - skiffScale * 0.06;
      ctx.beginPath();
      ctx.rect(-w, -h, w * 3, h + hatchLipY);
      ctx.clip();
    }
    ctx.translate(boardX, boardY);
    ctx.rotate(parentTilt);
    drawLiquidAlien(ctx, 0, 0, alienScale, alienAlpha,
      mix(0.19, -0.03, boardApproach));
    ctx.restore();

    if (pointGesture > 0.001 && boardApproach < 0.01) {
      const tip = raisedTentacle(
        1, pointGesture, boardX + minDim * 0.075,
        boardY - minDim * 0.080,
      );
      drawAlienFluidVehicleFormation(
        ctx, tip.x, tip.y, skiffRestX, skiffRestY,
        vehicleFormation, alienAlpha, alienScale, seed,
      );
    }
  }

  // Both hands rise over the deck. Six independent liquid threads converge
  // from the stranded hull to these two live, rotating tentacle tips.
  if (absorbT > 0.001 && absorbT < 1 && enterT < 0.001) {
    const armRise = smoothstep(absorbT / 0.19) *
      (1 - smoothstep((absorbT - 0.88) / 0.12));
    const leftTip = raisedTentacle(
      -1, armRise, boardX - minDim * 0.065, boardY - minDim * 0.090,
    );
    const rightTip = raisedTentacle(
      1, armRise, boardX + minDim * 0.082, boardY - minDim * 0.085,
    );
    drawSalvageFilaments(
      ctx, landedCraftPose.x, landedCraftPose.y,
      leftTip, rightTip, absorbT, splashAge, minDim, seed,
    );
  }

  const skiffAppear = smoothstep((vehicleFormation - 0.42) / 0.58);
  if (skiffAppear > 0.001) {
    if (leftT < 0.05) {
      ctx.save();
      const amount = skiffAppear * (1 - smoothstep(leftT / 0.05));
      const shade = ctx.createRadialGradient(
        skiffRestX, waterY + minDim * 0.013, 0,
        skiffRestX, waterY + minDim * 0.013, skiffScale * 1.3,
      );
      shade.addColorStop(0, "rgba(3,21,37," + (amount * 0.32) + ")");
      shade.addColorStop(1, "rgba(14,78,100,0)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(skiffRestX, waterY + minDim * 0.013,
        skiffScale * 1.3, skiffScale * 0.19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Draw AFTER the creature, so the metallic deck hides lower tentacles.
    // The sliding closure sits precisely over the existing dark oval.
    drawEscapeSkiff(ctx, skiffX, skiffY, skiffScale, skiffAppear,
      skiffRoll, hatchClose);
    if (dashT > 0.04 && dashT < 0.92) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.22 * Math.sin(Math.PI * dashT);
      ctx.translate(skiffX, skiffY);
      ctx.rotate(skiffRoll);
      const reflection = ctx.createLinearGradient(-skiffScale, 0, skiffScale, 0);
      reflection.addColorStop(0, "rgba(160,225,253,0)");
      reflection.addColorStop(0.60, "rgba(215,248,255,0.88)");
      reflection.addColorStop(1, "rgba(160,225,253,0)");
      ctx.strokeStyle = reflection;
      ctx.lineWidth = Math.max(0.7, skiffScale * 0.08);
      ctx.beginPath();
      ctx.moveTo(-skiffScale * 0.45, -skiffScale * 0.14);
      ctx.lineTo(skiffScale * 0.46, -skiffScale * 0.10);
      ctx.stroke();
      ctx.restore();
    }
    if (dashT > 0.12 && dashT < 0.96) {
      ctx.save();
      const amount = Math.sin(Math.PI * dashT);
      const wake = ctx.createRadialGradient(
        skiffX - skiffScale, skiffY, 0,
        skiffX - skiffScale, skiffY, skiffScale * 1.3);
      wake.addColorStop(0, "rgba(143,222,243," + 0.18 * amount + ")");
      wake.addColorStop(1, "rgba(96,171,222,0)");
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.ellipse(skiffX - skiffScale, skiffY,
        skiffScale * 1.3, skiffScale * 0.25, -0.20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // CLEAR appears only on completed boarding, and never fades out.
  const clearAlpha = smoothstep((splashAge - STAGE1_BOARD_COMPLETE_S) / 0.45);

  if (
    clearAlpha <=
    0.001
  ) {
    return;
  }

  ctx.save();

  ctx.globalAlpha =
    clearAlpha;

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  ctx.fillStyle =
    "rgba(248,252,255,0.98)";

  ctx.shadowColor =
    "rgba(3,14,31,0.68)";

  ctx.shadowBlur = 24;

  const small =
    Math.max(
      13,
      Math.min(
        25,
        w * 0.031,
      ),
    );

  const large =
    Math.max(
      42,
      Math.min(
        90,
        w * 0.096,
      ),
    );

  ctx.font =
    "500 " +
    small +
    "px Georgia, Times New Roman, serif";

  ctx.fillText(
    "S T A G E  1",
    w * 0.50,
    h * 0.18,
  );

  ctx.font =
    "500 " +
    large +
    "px Georgia, Times New Roman, serif";

  ctx.fillText(
    "C L E A R",
    w * 0.50,
    h * 0.255,
  );

  ctx.strokeStyle =
    "rgba(238,249,255,0.62)";

  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.moveTo(
    w * 0.31,
    h * 0.305,
  );

  ctx.lineTo(
    w * 0.69,
    h * 0.305,
  );

  ctx.stroke();

  ctx.restore();
}

function drawSurfaceApproach(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  surfaceMix: number,
  timeSinceVisualS: number,
  webglSurface: HTMLCanvasElement | null = null,
): void {
  if (surfaceMix <= 0.001) return;

  const t = typeof performance !== "undefined"
    ? performance.now() / 1000
    : timeSinceVisualS;
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const daylight = clamp01(Math.sin(((hour - 5.5) / 13) * Math.PI));
  const minDim = Math.min(w, h);
  const horizonY = h * 0.635;

  if (webglSurface) {
    ctx.save();
    ctx.globalAlpha = surfaceMix;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      webglSurface,
      0,
      0,
      w,
      h,
    );
    ctx.restore();

    /*
     * Moon is kept as the existing deterministic lunar overlay so phase and
     * visibility stay consistent with the rest of Stage 1.
     */
    if (daylight < 0.42) {
      drawAtmosphericMoon(
        ctx,
        w,
        horizonY,
        surfaceMix,
        Date.now(),
      );
    }

    return;
  }

  ctx.save();
  ctx.globalAlpha = surfaceMix;

  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  if (daylight > 0.55) {
    sky.addColorStop(0, "#086fc5");
    sky.addColorStop(0.46, "#2896e0");
    sky.addColorStop(0.80, "#8bcbed");
    sky.addColorStop(1, "#d9edf6");
  } else if (daylight > 0.08) {
    sky.addColorStop(0, "#06152e");
    sky.addColorStop(0.42, "#2a5f91");
    sky.addColorStop(0.78, "#c78172");
    sky.addColorStop(1, "#efd0a9");
  } else {
    sky.addColorStop(0, "#01040c");
    sky.addColorStop(0.46, "#04152c");
    sky.addColorStop(0.82, "#0a3054");
    sky.addColorStop(1, "#194a68");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizonY);

  if (daylight < 0.42) {
    drawStars(ctx, w, horizonY, timeSinceVisualS, false, 0, smoothstep((0.42 - daylight) / 0.42));
    drawAtmosphericMoon(ctx, w, horizonY, 0.95, Date.now());
  }

  let lightX = w * 0.80;
  if (daylight > 0.06) {
    const dayT = clamp01((hour - 5.5) / 13);
    lightX = mix(w * 0.08, w * 0.92, dayT);
    const sunY = horizonY * (0.72 - Math.sin(dayT * Math.PI) * 0.60);
    const sunR = minDim * mix(0.022, 0.040, daylight);
    const sun = ctx.createRadialGradient(lightX, sunY, 0, lightX, sunY, sunR * 7);
    sun.addColorStop(0, "rgba(255,255,246,0.98)");
    sun.addColorStop(0.09, "rgba(255,244,207,0.80)");
    sun.addColorStop(0.32, "rgba(255,220,150,0.23)");
    sun.addColorStop(1, "rgba(255,205,132,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(lightX, sunY, sunR * 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Drifting cloud banks.
  for (let cloud = 0; cloud < 9; cloud++) {
    const a = hash01(0x8ac31d, cloud * 17 + 3);
    const b = hash01(0x72e91f, cloud * 31 + 11);
    const scale = minDim * (0.045 + a * 0.070);
    const drift = (t * (1.5 + b * 1.5) + a * w * 1.7) % (w * 1.45);
    const cx = -w * 0.22 + drift;
    const cy = horizonY * (0.26 + b * 0.60);
    ctx.save();
    ctx.globalAlpha = surfaceMix * (0.20 + daylight * 0.38) * (0.45 + b * 0.45);
    for (let lobe = 0; lobe < 6; lobe++) {
      const ox = (lobe - 2.5) * scale * 0.35;
      const oy = Math.sin(lobe * 1.51 + a * 7.2) * scale * 0.13;
      const rr = scale * (0.40 + hash01(cloud * 83 + 9, lobe * 23 + 5) * 0.28);
      const g = ctx.createRadialGradient(cx + ox - rr * 0.22, cy + oy - rr * 0.22, rr * 0.06, cx + ox, cy + oy, rr);
      if (daylight > 0.28) {
        g.addColorStop(0, "rgba(255,255,255,0.96)");
        g.addColorStop(0.48, "rgba(245,250,252,0.74)");
        g.addColorStop(0.77, "rgba(166,193,213,0.24)");
      } else {
        g.addColorStop(0, "rgba(169,192,214,0.46)");
        g.addColorStop(0.56, "rgba(76,105,135,0.26)");
        g.addColorStop(0.82, "rgba(17,37,58,0.16)");
      }
      g.addColorStop(1, "rgba(30,50,66,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const ocean = ctx.createLinearGradient(0, horizonY, 0, h);
  if (daylight > 0.42) {
    ocean.addColorStop(0, "#2b82a8");
    ocean.addColorStop(0.20, "#17698f");
    ocean.addColorStop(0.56, "#07506f");
    ocean.addColorStop(1, "#02243d");
  } else {
    ocean.addColorStop(0, "#153e5c");
    ocean.addColorStop(0.24, "#092c48");
    ocean.addColorStop(0.60, "#04192f");
    ocean.addColorStop(1, "#010b18");
  }
  ctx.fillStyle = ocean;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY, w, h - horizonY);
  ctx.clip();
  ctx.lineCap = "round";

  /*
   * Filled swell ribbons instead of parallel stroke lines.
   *
   * The old version read like a wireframe because every depth row was a
   * continuous bright line. Here each swell has a dark trough and a soft,
   * broken crest, so the water reads as volume rather than a grid.
   */
  for (let row = 0; row < 24; row++) {
    const depth = (row + 1) / 25;
    const perspective = depth * depth;
    const baseY = horizonY + perspective * (h - horizonY);
    const amp = mix(0.45, minDim * 0.030, perspective);
    const speed = mix(0.24, 1.55, perspective);
    const phase = t * speed + row * 0.91;
    const ribbonH = mix(1.2, minDim * 0.030, perspective);

    ctx.beginPath();

    for (let seg = 0; seg <= 14; seg++) {
      const xx = (seg / 14) * w;
      const crest =
        Math.sin(phase + seg * 1.06 + row * 0.17) * amp * 0.66 +
        Math.sin(phase * 0.53 + seg * 2.11 + row * 0.39) * amp * 0.34;
      const yy = baseY + crest;

      if (seg === 0) ctx.moveTo(xx, yy - ribbonH * 0.35);
      else ctx.lineTo(xx, yy - ribbonH * 0.35);
    }

    for (let seg = 14; seg >= 0; seg--) {
      const xx = (seg / 14) * w;
      const trough =
        Math.sin(phase + seg * 1.06 + row * 0.17) * amp * 0.66 +
        Math.sin(phase * 0.53 + seg * 2.11 + row * 0.39) * amp * 0.34;
      const yy = baseY + trough;
      ctx.lineTo(xx, yy + ribbonH);
    }

    ctx.closePath();

    const band = ctx.createLinearGradient(
      0,
      baseY - amp - ribbonH,
      0,
      baseY + amp + ribbonH,
    );

    if (daylight > 0.35) {
      band.addColorStop(0, "rgba(102,188,214,0.10)");
      band.addColorStop(0.30, "rgba(47,127,161,0.08)");
      band.addColorStop(0.62, "rgba(5,54,82,0.18)");
      band.addColorStop(1, "rgba(1,24,43,0.30)");
    } else {
      band.addColorStop(0, "rgba(86,142,181,0.07)");
      band.addColorStop(0.34, "rgba(25,71,109,0.08)");
      band.addColorStop(0.68, "rgba(3,29,55,0.20)");
      band.addColorStop(1, "rgba(0,12,28,0.34)");
    }

    ctx.fillStyle = band;
    ctx.fill();
  }

  /*
   * Broken crest fragments. No continuous horizon-to-horizon strokes.
   * Near crests are wider and brighter; distant crests stay tiny.
   */
  ctx.lineCap = "round";

  for (let i = 0; i < 118; i++) {
    const seedA = hash01(0x6512ad, i * 17 + 3);
    const seedB = hash01(0x28e5c1, i * 31 + 11);
    const seedC = hash01(0x7b11f3, i * 43 + 5);

    const depth = Math.pow(seedA, 0.72);
    const yyBase = horizonY + depth * depth * (h - horizonY);
    const perspective = depth * depth;
    const speed = mix(0.35, 2.20, perspective);
    const travel =
      (seedB * 1.25 + t * speed * (0.010 + seedC * 0.020)) % 1.25;
    const xx = (travel - 0.12) * w;
    const amp = mix(0.5, minDim * 0.018, perspective);
    const yy =
      yyBase +
      Math.sin(
        t * speed +
        seedB * Math.PI * 2 +
        xx * 0.010,
      ) *
        amp;

    const crestW = mix(2.5, minDim * 0.090, perspective) * (0.35 + seedC * 0.65);
    const crestH = mix(0.35, minDim * 0.0055, perspective);

    ctx.strokeStyle =
      daylight > 0.30
        ? "rgba(226,247,253," + (0.055 + perspective * 0.24) + ")"
        : "rgba(169,210,239," + (0.040 + perspective * 0.16) + ")";

    ctx.lineWidth = Math.max(0.45, crestH);

    ctx.beginPath();
    ctx.moveTo(
      xx - crestW * 0.5,
      yy,
    );
    ctx.bezierCurveTo(
      xx - crestW * 0.15,
      yy - crestH * 1.4,
      xx + crestW * 0.15,
      yy + crestH * 0.8,
      xx + crestW * 0.5,
      yy,
    );
    ctx.stroke();
  }

  /*
   * Broken sunlight/moonlight glitter. Use many small irregular fragments
   * rather than a dotted vertical lane.
   */
  ctx.globalCompositeOperation = "screen";

  for (let i = 0; i < 96; i++) {
    const depth = hash01(0x4d911f, i * 19 + 7);
    const yy = horizonY + depth * depth * (h - horizonY);
    const width = mix(w * 0.014, w * 0.30, depth);
    const jitter =
      (hash01(0x91af33, i * 23 + Math.floor(t * 4)) - 0.5) *
      width;
    const xx = lightX + jitter;
    const glint = hash01(0xa1349d, i * 37 + Math.floor(t * 7));
    const rr = mix(0.45, 3.8, depth) * (0.45 + glint * 0.85);

    ctx.fillStyle =
      daylight > 0.15
        ? "rgba(255,246,218," + (0.025 + depth * 0.18) + ")"
        : "rgba(194,226,255," + (0.020 + depth * 0.12) + ")";

    ctx.beginPath();
    ctx.ellipse(
      xx,
      yy,
      rr * (1.4 + depth * 3.2),
      rr * (0.16 + glint * 0.28),
      (glint - 0.5) * 0.24,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  /*
   * Foreground dark troughs give the near water photographic depth.
   */
  ctx.globalCompositeOperation = "source-over";

  for (let i = 0; i < 14; i++) {
    const depth = (i + 1) / 14;
    const y =
      horizonY +
      mix(
        0.48,
        1,
        depth,
      ) *
        (h - horizonY);
    const offset =
      Math.sin(
        t * (0.38 + depth * 0.62) +
        i * 1.71,
      ) *
      w *
      0.08;

    const trough = ctx.createRadialGradient(
      w * 0.5 + offset,
      y,
      0,
      w * 0.5 + offset,
      y,
      w * mix(0.16, 0.42, depth),
    );

    trough.addColorStop(0, "rgba(0,10,25," + (0.045 + depth * 0.075) + ")");
    trough.addColorStop(1, "rgba(0,10,25,0)");

    ctx.fillStyle = trough;
    ctx.beginPath();
    ctx.ellipse(
      w * 0.5 + offset,
      y,
      w * mix(0.16, 0.42, depth),
      minDim * mix(0.012, 0.050, depth),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();

  const haze = ctx.createLinearGradient(0, horizonY - h * 0.040, 0, horizonY + h * 0.050);
  haze.addColorStop(0, "rgba(255,255,255,0)");
  haze.addColorStop(0.48, daylight > 0.20 ? "rgba(230,246,252,0.32)" : "rgba(104,151,188,0.14)");
  haze.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizonY - h * 0.05, w, h * 0.11);
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
    cx, cy, r * 0.995,
    cx, cy, r * 1.09,
  );
  haze.addColorStop(0, "rgba(125,205,255,0)");
  haze.addColorStop(0.38, `rgba(125,205,255,${0.022 + hazeStrength * 0.035})`);
  haze.addColorStop(0.60, `rgba(178,225,255,${0.036 + hazeStrength * 0.050})`);
  haze.addColorStop(0.80, `rgba(85,160,245,${0.018 + hazeStrength * 0.030})`);
  haze.addColorStop(1, "rgba(55,120,235,0)");

  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.09, 0, Math.PI * 2);
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
  ctx.beginPath();
  ctx.moveTo(length * 0.74, 0);
  ctx.bezierCurveTo(length * 0.61, -width * 0.055, length * 0.39, -width * 0.14, length * 0.12, -width * 0.22);
  ctx.lineTo(-length * 0.12, -width * 0.46);
  ctx.lineTo(-length * 0.40, -width * 0.52);
  ctx.lineTo(-length * 0.56, -width * 0.30);
  ctx.lineTo(-length * 0.50, 0);
  ctx.lineTo(-length * 0.56, width * 0.30);
  ctx.lineTo(-length * 0.40, width * 0.52);
  ctx.lineTo(-length * 0.12, width * 0.46);
  ctx.lineTo(length * 0.12, width * 0.22);
  ctx.bezierCurveTo(length * 0.39, width * 0.14, length * 0.61, width * 0.055, length * 0.74, 0);
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
  assistMode = false,
  landingPalette = 0,
): void {
  const width = length * 0.62;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const assistBlink =
    assistMode
      ? (
          Math.floor(
            performance.now() /
              260,
          ) %
            2 ===
          0
            ? 1
            : 0.28
        )
      : 1;

  ctx.globalAlpha =
    alpha *
    assistBlink;

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

  // Deep blue enamel body. Reflections move continuously with time and attitude.
  craftOutline(ctx, length, width);
  const enamelClock = typeof performance !== "undefined" ? performance.now() / 1000 : 0;
  const enamelPulse = 0.5 + 0.5 * Math.sin(enamelClock * 1.35);
  const reflectionSweep = 0.5 + 0.5 * Math.sin(enamelClock * 0.74 + angle * 1.7);
  const hull = ctx.createLinearGradient(-length * 0.56, -width * 0.34, length * 0.74, width * 0.26);
  hull.addColorStop(0, "rgb(" + (2 + Math.round(enamelPulse * 4)) + ",10," + (28 + Math.round(enamelPulse * 18)) + ")");
  hull.addColorStop(0.16, "rgb(3," + (42 + Math.round(enamelPulse * 18)) + "," + (103 + Math.round(enamelPulse * 28)) + ")");
  hull.addColorStop(0.30, "rgb(" + (6 + Math.round(reflectionSweep * 8)) + "," + (92 + Math.round(enamelPulse * 32)) + "," + (188 + Math.round(reflectionSweep * 44)) + ")");
  hull.addColorStop(0.46, "rgb(" + (120 + Math.round(reflectionSweep * 76)) + "," + (154 + Math.round(reflectionSweep * 64)) + "," + (176 + Math.round(enamelPulse * 34)) + ")");
  hull.addColorStop(0.56, "rgb(" + (20 + Math.round(enamelPulse * 30)) + "," + (138 + Math.round(reflectionSweep * 66)) + "," + (126 + Math.round(enamelPulse * 44)) + ")");
  hull.addColorStop(0.68, "rgb(" + (10 + Math.round(reflectionSweep * 24)) + "," + (96 + Math.round(enamelPulse * 36)) + "," + (190 + Math.round(reflectionSweep * 42)) + ")");
  hull.addColorStop(0.82, "rgb(2," + (27 + Math.round(enamelPulse * 12)) + "," + (74 + Math.round(reflectionSweep * 25)) + ")");
  hull.addColorStop(1, "rgb(0,7,20)");
  ctx.fillStyle = hull;
  ctx.fill();

  // Transition the SAME craft to a violet enamel hull only on final ocean
  // approach. Deep red and jade reflections bleed softly across the surface.
  if (landingPalette > 0.001) {
    ctx.save();
    craftOutline(ctx, length, width);
    ctx.clip();
    ctx.globalAlpha *= landingPalette;
    const violet = ctx.createLinearGradient(
      -length * 0.42, -width * 0.42,
      length * 0.68, width * 0.40
    );
    violet.addColorStop(0, "#140c2c");
    violet.addColorStop(0.19, "#432169");
    violet.addColorStop(0.39, "#8152bb");
    violet.addColorStop(0.54, "#442169");
    violet.addColorStop(0.72, "#4e265f");
    violet.addColorStop(0.86, "#281446");
    violet.addColorStop(1, "#080918");
    ctx.fillStyle = violet;
    ctx.fillRect(-length, -width, length * 2, width * 2);

    ctx.globalCompositeOperation = "screen";
    for (const [px, py, radius, rr, gg, bb, strength, phase] of [
      [-0.28, -0.22, 0.36, 242, 51, 83, 0.47, 0.0],
      [0.22, 0.17, 0.34, 220, 69, 95, 0.35, 1.8],
      [-0.02, 0.28, 0.29, 36, 210, 160, 0.49, 2.5],
      [0.37, -0.16, 0.27, 59, 215, 198, 0.42, 3.8],
      [-0.28, 0.23, 0.32, 49, 131, 233, 0.40, 4.5],
      [0.16, -0.30, 0.29, 78, 219, 237, 0.39, 5.2],
    ] as const) {
      // Reflections bleed across enamel as soft areas, never stripes.
      const light = 0.76 + 0.24 * Math.sin(enamelClock * 0.83 + phase);
      const bx = length * (px + 0.035 * Math.sin(enamelClock * 0.53 + phase));
      const by = width * py;
      const bleed = ctx.createRadialGradient(bx, by, 0, bx, by, length * radius);
      const color = "rgba(" + rr + "," + gg + "," + bb + ",";
      bleed.addColorStop(0, color + (strength * light) + ")");
      bleed.addColorStop(0.45, color + (strength * light * 0.21) + ")");
      bleed.addColorStop(1, color + "0)");
      ctx.fillStyle = bleed;
      ctx.fillRect(-length, -width, length * 2, width * 2);
    }
    // Violet enamel has curved volume; red and jade reflections stay
    // localized within the hull instead of becoming decorative stripes.
    const domeLight = ctx.createRadialGradient(
      -length * 0.07, -width * 0.17, 0,
      -length * 0.07, -width * 0.17, length * 0.55
    );
    domeLight.addColorStop(0, "rgba(246,205,255,0.31)");
    domeLight.addColorStop(0.25, "rgba(218,135,246,0.16)");
    domeLight.addColorStop(1, "rgba(218,135,246,0)");
    ctx.fillStyle = domeLight;
    ctx.fillRect(-length, -width, length * 2, width * 2);
    ctx.restore();
  }

  ctx.save();
  craftOutline(ctx, length, width);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  const sweepX = mix(-length * 0.50, length * 0.54, reflectionSweep);
  const gloss = ctx.createLinearGradient(sweepX - length * 0.20, -width * 0.48, sweepX + length * 0.18, width * 0.42);
  gloss.addColorStop(0, "rgba(255,255,255,0)");
  gloss.addColorStop(0.42, landingPalette > 0.5 ? "rgba(212,127,232,0.05)" : "rgba(116,201,255,0.05)");
  gloss.addColorStop(0.50, "rgba(255,255,255," + (0.28 + enamelPulse * 0.28) + ")");
  gloss.addColorStop(0.58, landingPalette > 0.5 ? "rgba(177,110,205,0.07)" : "rgba(97,173,255,0.07)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(-length, -width, length * 2, width * 2);
  ctx.restore();

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
  ctx.fillStyle = landingPalette > 0.5
    ? "rgba(113,61,148,0.30)"
    : "rgba(32,91,151,0.30)";
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

  if (landingPalette > 0.5) {
    // Soft facial curvature under the lacquer, no panel outline.
    const surface = ctx.createLinearGradient(
      -length * 0.35, -width * 0.32,
      length * 0.38, width * 0.28
    );
    surface.addColorStop(0, "rgba(96,38,128,0.04)");
    surface.addColorStop(0.40, "rgba(226,111,171,0.17)");
    surface.addColorStop(0.72, "rgba(28,159,100,0.11)");
    surface.addColorStop(1, "rgba(24,13,40,0)");
    ctx.fillStyle = surface;
    ctx.beginPath();
    ctx.moveTo(-length * 0.48, -width * 0.22);
    ctx.bezierCurveTo(
      -length * 0.12, -width * 0.39,
      length * 0.35, -width * 0.13,
      length * 0.47, width * 0.06
    );
    ctx.quadraticCurveTo(
      -length * 0.06, width * 0.31,
      -length * 0.48, -width * 0.22
    );
    ctx.fill();
  }

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

  ctx.strokeStyle =
    "rgba(218,226,228,0.30)";
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
  entrySteepness = 0.5,
): void {
  if (heat < 0.12) return;

  const intensity = smoothstep((heat - 0.12) / 0.88);
  const timeBucket = Math.floor(playback * 96);
  const steep = clamp01(entrySteepness);
  const shallow = 1 - steep;

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
    const undersideBias =
      length * shallow * (0.055 + b * 0.095);
    const y0 =
      side * length * (0.08 + intensity * (0.12 + b * 0.10)) +
      undersideBias;
    const back =
      length *
      (0.75 + b * 0.8 + intensity * (1.25 + c * 1.5)) *
      mix(1.24, 0.88, steep);
    const bend =
      (c - 0.5) * length * (0.10 + intensity * 0.18) +
      undersideBias * 0.30;

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

function drawSuccessReentryBloom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  heat: number,
  playback: number,
): void {
  if (heat < 0.06) return;

  const intensity =
    smoothstep(
      (heat - 0.06) / 0.94,
    );

  const pulse =
    0.5 +
    0.5 *
      Math.sin(
        playback * 9.0,
      );

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "screen";

  const tail =
    ctx.createLinearGradient(
      -length * 2.4,
      0,
      length * 0.55,
      0,
    );

  tail.addColorStop(
    0,
    "rgba(6,38,110,0)",
  );
  tail.addColorStop(
    0.24,
    "rgba(22,92,188," +
      (0.04 + intensity * 0.10) +
      ")",
  );
  tail.addColorStop(
    0.46,
    "rgba(65,191,171," +
      (0.04 + intensity * 0.11) +
      ")",
  );
  tail.addColorStop(
    0.66,
    "rgba(222,236,240," +
      (0.05 + intensity * 0.12) +
      ")",
  );
  tail.addColorStop(
    0.84,
    "rgba(37,121,237," +
      (0.08 + intensity * 0.15) +
      ")",
  );
  tail.addColorStop(
    1,
    "rgba(168,224,255,0)",
  );

  ctx.fillStyle = tail;
  ctx.shadowColor =
    "rgba(86,174,255," +
    (0.10 + intensity * 0.16) +
    ")";
  ctx.shadowBlur =
    length *
    (
      0.22 +
      pulse * 0.14
    );

  ctx.beginPath();
  ctx.moveTo(
    length * 0.58,
    0,
  );
  ctx.bezierCurveTo(
    length * 0.10,
    -length * 0.22,
    -length * 0.86,
    -length * 0.28,
    -length * 2.1,
    -length * 0.10,
  );
  ctx.bezierCurveTo(
    -length * 2.45,
    0,
    -length * 0.95,
    length * 0.30,
    length * 0.58,
    0,
  );
  ctx.closePath();
  ctx.fill();

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
  entrySteepness = 0.5,
): void {
  if (heat < 0.035) return;

  const width = length * 0.64;
  const intensity = smoothstep(heat);
  const timeBucket = Math.floor(playback * 120);
  const steep = clamp01(entrySteepness);
  const shallow = 1 - steep;
  const undersideOffset =
    width * shallow * (0.10 + intensity * 0.10);
  const tailStretch = mix(1.24, 0.90, steep);
  const noseFocus = mix(0.92, 1.10, steep);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";

  // Detached rounded bow-shock volume.
  const domeX =
    length * (0.60 + intensity * 0.04 + steep * 0.025);
  const domeRx =
    length * (0.20 + intensity * 0.20) * noseFocus;
  const domeRy =
    width *
    (0.48 + intensity * 0.38) *
    mix(1.08, 0.94, steep);

  ctx.save();
  ctx.translate(
    domeX,
    undersideOffset * 0.38,
  );
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
    -length * 1.95 * tailStretch,
    undersideOffset,
    length * 0.67,
    undersideOffset * 0.15,
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
  ctx.moveTo(
    length * 0.62,
    undersideOffset * 0.15,
  );
  ctx.bezierCurveTo(
    length * 0.22,
    -width * (0.44 + intensity * 0.18) +
      undersideOffset * 0.18,
    -length * 0.30,
    -width * (0.66 + intensity * 0.30) +
      undersideOffset * 0.35,
    -length * 1.58 * tailStretch,
    -width * 0.16 + undersideOffset * 0.90,
  );
  ctx.lineTo(
    -length * 2.25 * tailStretch,
    undersideOffset * 1.25,
  );
  ctx.lineTo(
    -length * 1.58 * tailStretch,
    width * 0.16 + undersideOffset * 1.65,
  );
  ctx.bezierCurveTo(
    -length * 0.30,
    width * (0.66 + intensity * 0.30) +
      undersideOffset * 0.95,
    length * 0.22,
    width * (0.44 + intensity * 0.18) +
      undersideOffset * 0.55,
    length * 0.62,
    undersideOffset * 0.15,
  );
  ctx.closePath();
  ctx.fill();

  // Irregular incandescent sparks: short streaks / flakes rather than circles.
  for (let i = 0; i < 34; i++) {
    const a = hash01(seed ^ 0x43f14a1d, i * 13 + timeBucket);
    const b = hash01(seed ^ 0xa511e9b3, i * 19 + 3);
    const c = hash01(seed ^ 0x27d4eb2f, i * 29 + 17);

    const sparkUnderside =
      width * shallow * (0.10 + b * 0.24);
    const back =
      length *
      (0.58 + a * (1.6 + intensity * 2.35)) *
      mix(1.30, 0.82, steep);
    const py =
      width * (b - 0.5) * (0.20 + intensity * 1.05) +
      sparkUnderside;
    const sparkLen =
      length *
      (0.035 + c * 0.12) *
      (0.5 + intensity) *
      mix(1.34, 0.82, steep);
    const drift =
      (b - 0.5) * length * 0.08 +
      sparkUnderside * 0.12;

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
  playbackProgressRef,
  angleNorm,
  spaceApproach,
  spaceShare,
  powerNorm,
  variant,
  assistMode = false,
}: {
  phase: ReentryPhase;
  result: ReentryResult | null;
  flightProgress: number;
  playbackProgressRef?: { current: number };
  angleNorm: number;
  spaceApproach: SpaceApproachResult | null;
  spaceShare: number;
  powerNorm: number;
  variant: ReentryArtVariant;
  assistMode?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earthRef = useRef<HTMLImageElement | null>(null);
  const issPhotoRefs = useRef<(HTMLImageElement | null)[]>([null, null]);
  const flightUtcHourRef = useRef(new Date().getUTCHours());
  const oceanWebGLRef =
    useRef<ReentryOceanWebGLRenderer | null>(null);
  const resultSoundRef = useRef<string | null>(null);
  const stage1ClearSoundRef = useRef<string | null>(null);
  const visualLatchPlaybackRef = useRef<number | null>(null);
  const latchPhysicsPlaybackRef = useRef(0);
  const latchPoseRef = useRef<{ x: number; y: number; angle: number } | null>(
    null,
  );
  const prevHeadingRef = useRef<number | null>(null);

  // React updates flightProgress frequently. Restarting the requestAnimationFrame
  // effect on every update causes frame cancellation/recreation and visible
  // cadence jitter. Read current props from one ref in a stable animation loop.
  const presentationRef = useRef({
    phase, result, flightProgress, angleNorm, spaceApproach, spaceShare,
    powerNorm, variant, assistMode,
  });
  presentationRef.current = {
    phase, result, flightProgress, angleNorm, spaceApproach, spaceShare,
    powerNorm, variant, assistMode,
  };

  // SPACE integration may take thousands of steps. Preview it only when
  // direction changes: never run the solver on every animation frame.
  const idleSpaceCacheRef = useRef<{
    angleNorm: number;
    value: SpaceApproachResult;
  } | null>(null);
  // Non-visual diagnostics and adaptive presentation only. These timings
  // never influence Stage 1 physics, its success result or replay time.
  const renderPerfRef = useRef({
    lastRafMs: 0,
    intervalAvgMs: 16.7,
    drawAvgMs: 0,
    oceanAvgMs: 0,
    atmosphereAvgMs: 0,
    epilogueAvgMs: 0,
    compositeAvgMs: 0,
    oceanActive: false,
    oceanScale: 1,
    frameCount: 0,
  });

  useEffect(() => {
    if (phase === "flight") flightUtcHourRef.current = new Date().getUTCHours();
  }, [phase, result?.seed]);

  useEffect(() => {
    let live = true;

    void loadImage(EARTH_SOURCE)
      .then((img) => {
        if (live) earthRef.current = img;
      })
      .catch(() => {
        if (live) earthRef.current = null;
      });

    ISS_EARTH_PHOTOS.forEach((src, index) => {
      void loadImage(src).then((img) => {
        if (!live) return;
        // Precompute the softened photo while loading, never inside the shot.
        softlyMaskedEarthPhoto(img);
        issPhotoRefs.current[index] = img;
      }).catch(() => {
        if (live) issPhotoRefs.current[index] = null;
      });
    });

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (variant !== "stage") {
      return;
    }

    const renderer =
      createReentryOceanWebGLRenderer();

    oceanWebGLRef.current =
      renderer;

    // Prewarm the heavy fragment shader on the setup screen, not during
    // the first visible sea frame. This avoids a late shader compile stall.
    const warmupTimer = window.setTimeout(() => {
      renderer?.render({ width: 64, height: 36, timeS: 0, sceneSeed: 1 });
    }, 150);

    return () => {
      window.clearTimeout(warmupTimer);
      renderer?.destroy();

      if (
        oceanWebGLRef.current ===
        renderer
      ) {
        oceanWebGLRef.current =
          null;
      }
    };
  }, [variant]);

  useEffect(() => {
    if (variant !== "stage") return;

    if (phase === "power") {
      resultSoundRef.current = null;
      stage1ClearSoundRef.current = null;
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
      const {
        phase, result, flightProgress, angleNorm, spaceApproach, spaceShare,
        powerNorm, variant, assistMode,
      } = presentationRef.current;
      // The sea is active only in the surface shot of this actual frame.
      renderPerfRef.current.oceanActive = false;
      const parent = canvas.parentElement;
      if (!parent) return;

      const w = Math.max(1, parent.clientWidth);
      const h = Math.max(1, parent.clientHeight);
      // The 2D canvas is composited with a live WebGL ocean; reducing only
      // the epilogue DPR bounds pixel fill without touching Physics or shaders.
      const cinematicDprCap =
        variant === "stage" &&
        (phase === "flight" || phase === "result") &&
        result?.outcome === "EARTH_REACHED"
          ? 1.55
          : 2;
      const dpr = Math.min(cinematicDprCap, window.devicePixelRatio || 1);

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
            ? (playbackProgressRef?.current ?? flightProgress)
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

      const inboundDurationMs =
        spaceInboundDurationMs(
          powerNorm,
        );

      const upperAtmosphereDurationS =
        atmosphereTransitionDurationS(
          powerNorm,
        );

      // Use the computed launch trajectory during flight. In idle preview,
      // reuse the last simulated SPACE trajectory until aim actually changes.
      let idleSpace: SpaceApproachResult | null = null;
      if (!spaceApproach) {
        const cached = idleSpaceCacheRef.current;
        if (cached && cached.angleNorm === angleNorm) {
          idleSpace = cached.value;
        } else {
          idleSpace = launchSpaceApproach(
            mapLaunchToInput(0.5, angleNorm, 1).initialSpeedMps,
            angleNorm,
          );
          idleSpaceCacheRef.current = { angleNorm, value: idleSpace };
        }
      }
      const activeSpace = spaceApproach ?? idleSpace;
      if (!activeSpace) return;
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
        miss
          ? sampleSpacePointByElapsed01(
              activeSpace.points,
              pathT,
            )
          : sampleSpacePoint(
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
      // Preview at POWER always faces upper-right; DIRECTION selection then
      // displays the player's actual heading, not a permanently fixed sprite.
      // The 48-second clock-hand direction is 18 degrees above horizontal
      // toward the left (198 degrees in canvas coordinates).
      const launchHeading = phase === "power"
        ? -9 * Math.PI / 10
        : directionNormToScreenHeadingRad(angleNorm);

      const pathEarth =
        launchEarthView(w, h);

      const pathThickness =
        atmosphereThicknessPx(
          pathEarth.r,
        );
      void pathThickness;

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

      let pose = {
        x: launch.x,
        y: launch.y,
        angle: launchHeading,
      };

      if (
        firstSpace &&
        spaceState
      ) {
        const worldEarthDistance =
          Math.hypot(
            firstSpace.position.x,
            firstSpace.position.y,
          );

        const screenEarthDistance =
          Math.hypot(
            launch.x - pathEarth.x,
            launch.y - pathEarth.y,
          );

        pose =
          straightSpaceScreenPose({
            currentPosition:
              spaceState.position,
            initialPosition:
              firstSpace.position,
            worldEarthDistance,
            screenEarthDistance,
            launchPoint:
              launch,
            launchHeading,
          });

        if (miss) {
          pose =
            gravitationalFlybyScreenPose({
              pose,
              launchPoint:
                launch,
              earthCenter: {
                x: pathEarth.x,
                y: pathEarth.y,
              },
              launchHeading,
              spaceT,
            });
        }
      }

      const atmosphereDistancePx = signedDistanceToAtmospherePx(
        pose.x,
        pose.y,
        earth.x,
        earth.y,
        earth.r,
        atmosphereThicknessPx(earth.r),
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
      const timeSinceVisualAtmosphereEntryS =
        latched
          ? elapsedSincePlaybackS(
              playback,
              visualLatchPlaybackRef.current ??
                playback,
              Math.max(
                1e-4,
                spaceShare,
              ),
              inboundDurationMs,
            )
          : 0;

      const atmosphereSceneMix =
        latched && !miss
          ? smoothstep(
              timeSinceVisualAtmosphereEntryS /
                upperAtmosphereDurationS,
            )
          : 0;

      if (
        variant === "stage" &&
        phase === "flight" &&
        outcome === "EARTH_REACHED" &&
        timeSinceVisualAtmosphereEntryS >= STAGE1_SPLASH_S + STAGE1_BOARD_COMPLETE_S
      ) {
        const clearAudioKey =
          `${result?.seed ?? 0}:stage1-clear`;

        if (
          stage1ClearSoundRef.current !==
          clearAudioKey
        ) {
          stage1ClearSoundRef.current =
            clearAudioKey;

          startStage1ClearAudio();
        }
      }


      const physicalEntryGamma =
        spaceApproach?.kind === "ATMOSPHERE_ENTRY"
          ? Math.abs(spaceApproach.entry.gammaRad)
          : 0.08;

      const contactPolar = latchPoseRef.current
        ? Math.atan2(
            latchPoseRef.current.y - pathEarth.y,
            latchPoseRef.current.x - pathEarth.x,
          )
        : 0;

      // Camera roll is a presentation effect. Entry gamma and the actual
      // simulation path remain the authority for flight and success.
      const horizonAngle = lineAngleNearHorizontal(
        contactPolar + Math.PI / 2
        + (powerNorm - 0.5) * 0.38
        + (angleNorm - 0.5) * 0.14,
      );

      const atmosphereEntryHeading = latchPoseRef.current
        ? descendingCameraHeading(
            horizonAngle,
            physicalEntryGamma,
            latchPoseRef.current.angle,
          )
        : launchHeading;

      const entrySteepness = clamp01((physicalEntryGamma - 0.02) / 0.62);
      const surfacePhase = (((contactPolar / (Math.PI * 2)) % 1) + 1) % 1;
      const earthRegion = entrySurfaceRegion(
        powerNorm,
        angleNorm,
        result?.seed ?? 1,
        flightUtcHourRef.current,
      );

const failureDepth =
  failureVisualDepth01(
    result?.metrics.minimumAltitudeM,
    outcome,
    powerNorm,
    physicalEntryGamma,
  );

const failureStartS =
  failureDestructionStartS(
    result?.metrics.minimumAltitudeM,
    outcome,
    powerNorm,
    physicalEntryGamma,
  );

const failureTravelT =
  outcome === "BURN" ||
  outcome === "BREAK"
    ? smoothstep(
        timeSinceVisualAtmosphereEntryS /
          Math.max(
            6.75,
            failureStartS +
              DESTRUCTION_BURST_S,
          ),
      )
    : 0;


      if (latched && result && latchPoseRef.current && !miss) {
        const cameraIn =
          smoothstep(
            timeSinceVisualAtmosphereEntryS /
              Math.min(
                1.45,
                Math.max(
                  0.90,
                  upperAtmosphereDurationS *
                    0.38,
                ),
              ),
          );
        const minSide = Math.min(w, h);

        // Steeper entries read more directly downward, glancing entries
        // arrive from the side. The relative look also responds to POWER.
        const approachBias = (powerNorm - 0.5) * 0.12;
        const atmosphericAnchor = {
          x: w * (mix(0.56, 0.67, entrySteepness) + approachBias),
          y: h * (mix(0.25, 0.38, entrySteepness) +
            (1 - entrySteepness) * (0.5 - powerNorm) * 0.055),
        };

        const forwardDrift =
          minSide *
          mix(0.12, 0.055, entrySteepness) *
          smoothstep(timeSinceVisualAtmosphereEntryS / 8.5);

        let trackedX =
          atmosphericAnchor.x +
          Math.cos(atmosphereEntryHeading) * forwardDrift;
        let trackedY =
          atmosphericAnchor.y +
          Math.sin(atmosphereEntryHeading) * forwardDrift;
        let trackedAngle = atmosphereEntryHeading;

        if (
          outcome === "BURN" ||
          outcome === "BREAK"
        ) {
          const lateralPhase =
            Math.sin(surfacePhase * Math.PI * 2);

          const failureTargetX =
            w *
            (
              0.50 +
              lateralPhase *
                mix(0.08, 0.19, failureDepth)
            );

          const failureTargetY =
            h * mix(0.50, 0.76, failureDepth);

          const dive = smoothstep(failureTravelT);

          trackedX = mix(
            trackedX,
            failureTargetX,
            dive * 0.78,
          );

          trackedY = mix(
            trackedY,
            failureTargetY,
            dive * 0.90,
          );

          trackedAngle = lerpAngle(
            trackedAngle,
            atmosphereEntryHeading +
              mix(0.02, 0.14, entrySteepness),
            dive * 0.35,
          );
        }

        const landing =
          outcome === "EARTH_REACHED"
            ? successLandingT(timeSinceVisualAtmosphereEntryS)
            : 0;

        if (landing > 0) {
          const settle = smoothstep((landing - 0.72) / 0.28);
          const oceanClock = typeof performance !== "undefined"
            ? performance.now() / 1000
            : timeSinceVisualAtmosphereEntryS;
          const longSwell = Math.sin(oceanClock * 1.10);
          const shortSwell = Math.sin(oceanClock * 2.18 + 1.3);
          const ocean = {
            x: w * 0.48 + settle * (longSwell * Math.min(w, h) * 0.007 + shortSwell * Math.min(w, h) * 0.002),
            y: h * 0.78 + settle * (longSwell * Math.min(w, h) * 0.017 + shortSwell * Math.min(w, h) * 0.006),
          };
          trackedX = mix(trackedX, ocean.x, landing);
          trackedY = mix(trackedY, ocean.y, landing);
          const floatedAngle = Math.PI / 2 + settle * (longSwell * 0.055 + shortSwell * 0.018);
          trackedAngle = lerpAngle(trackedAngle, floatedAngle, smoothstep(landing) * 0.72);
        }

        pose = {
          x: mix(latchPoseRef.current.x, trackedX, cameraIn),
          y: mix(latchPoseRef.current.y, trackedY, cameraIn),
          angle: lerpAngle(latchPoseRef.current.angle, trackedAngle, cameraIn),
        };
      }

      if (
        !latched ||
        idle ||
        miss
      ) {
        if (!miss) {
          pose.angle =
            launchHeading;
        }

        prevHeadingRef.current =
          pose.angle;
      } else if (
        prevHeadingRef.current ===
          null
      ) {
        prevHeadingRef.current =
          pose.angle;
      } else {
        pose.angle =
          clampHeadingJump(
            prevHeadingRef.current,
            pose.angle,
          );

        prevHeadingRef.current =
          pose.angle;
      }

      const atmosphereGate = latched && !miss ? 1 : 0;
      const plasmaAge =
        !latched || miss
          ? 0
          : clamp01(
              (
                timeSinceVisualAtmosphereEntryS -
                0.70
              ) /
                Math.max(
                  2.1,
                  upperAtmosphereDurationS *
                    1.10,
                ),
            );

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

      const peakTimeS =
        outcome === "EARTH_REACHED"
          ? 10
          : failureStartS;

      const burnAge01 = smoothstep(
        (timeSinceVisualAtmosphereEntryS - 0.75) /
          Math.max(1.2, peakTimeS - 0.75),
      );

      const successHeatCut =
        outcome === "EARTH_REACHED"
          ? 1 - smoothstep((timeSinceVisualAtmosphereEntryS - 10) / 1.15)
          : 1;

      const cinematicHeat =
        burnAge01 *
        successHeatCut *
        (outcome === "EARTH_REACHED" ? 0.82 : 0.96);

      const heat =
        miss || !latched || outcome === "SKIP"
          ? 0
          : clamp01(
              Math.max(
                gatedHeat * atmosphereGate * plasmaAge,
                cinematicHeat,
              ),
            );

      const rawDestructionAmount =
        smoothstep(
          destructionAmountFromEntryS(
            timeSinceVisualAtmosphereEntryS,
            outcome,
            result?.metrics.minimumAltitudeM,
            powerNorm,
            physicalEntryGamma,
          ),
        );

      const deepAtmosphereReady =
        latched &&
        !miss &&
        atmosphereSceneMix >=
          0.72 &&
        timeSinceVisualAtmosphereEntryS >=
          5.0;

      const destructionAmount =
        deepAtmosphereReady
          ? rawDestructionAmount
          : 0;

      const failureUnlocked =
        deepAtmosphereReady &&
        (
          outcome === "BURN" ||
          outcome === "BREAK"
        ) &&
        timeSinceVisualAtmosphereEntryS >=
          failureStartS;

      if (variant === "stage" && phase === "flight") {
        setReentryAudioFlight(
          playback,
          heat,
          outcome,
          timeSinceVisualAtmosphereEntryS,
          failureStartS,
          destructionAmount,
          outcome === "EARTH_REACHED"
            ? successLandingT(timeSinceVisualAtmosphereEntryS)
            : 0,
        );
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
        const perf = renderPerfRef.current;
        const showSurfaceApproach =
          outcome === "EARTH_REACHED" &&
          timeSinceVisualAtmosphereEntryS >= 10.5;
        const surfaceMix = showSurfaceApproach
          ? smoothstep((timeSinceVisualAtmosphereEntryS - 10.5) / 2.2)
          : 0;

        // Once the opaque WebGL ocean covers the entire frame, the costly
        // full-screen ISS image below it is literally invisible. Skip drawing
        // it (and its extra moon/glow) instead of compositing two full frames.
        if (surfaceMix < 0.999) {
          const atmosphereDrawStart = performance.now();
          drawAtmosphereVolume(
            ctx,
            issPhotoRefs.current[earthRegion.photoIndex] ??
              issPhotoRefs.current.find((img) => img !== null) ?? null,
            earthRegion,
            w,
            h,
            atmosphereSceneMix,
            timeSinceVisualAtmosphereEntryS,
            horizonAngle,
            surfacePhase,
            entrySteepness,
          );
          const atmosphereMs = performance.now() - atmosphereDrawStart;
          perf.atmosphereAvgMs = perf.atmosphereAvgMs
            ? perf.atmosphereAvgMs * 0.93 + atmosphereMs * 0.07
            : atmosphereMs;
        }

        // Adaptive WebGL resolution changes only after persistent slow
        // frames, with wide hysteresis. It preserves the same shader, waves,
        // camera and playback clock; fewer pixels merely reduce GPU work.
        perf.oceanActive = showSurfaceApproach && !!oceanWebGLRef.current;
        if (
          showSurfaceApproach
        ) {
          const webglStart = performance.now();
          const scale = perf.oceanScale;
          const oceanSurface =
            oceanWebGLRef.current?.render({
              width: Math.max(1, Math.round(w * scale)),
              height: Math.max(1, Math.round(h * scale)),
              timeS:
                timeSinceVisualAtmosphereEntryS,
              sceneSeed:
                result?.seed ??
                1,
            }) ??
            null;
          const oceanMs = performance.now() - webglStart;
          perf.oceanAvgMs = perf.oceanAvgMs
            ? perf.oceanAvgMs * 0.93 + oceanMs * 0.07
            : oceanMs;

          const compositeStart = performance.now();
          drawSurfaceApproach(
            ctx,
            w,
            h,
            surfaceMix,
            timeSinceVisualAtmosphereEntryS,
            oceanSurface,
          );
          const compositeMs = performance.now() - compositeStart;
          perf.compositeAvgMs = perf.compositeAvgMs
            ? perf.compositeAvgMs * 0.93 + compositeMs * 0.07
            : compositeMs;
        }

        /*
         * Failure runs stay inside the curved atmosphere-volume view.
         * Do not reuse drawSurfaceApproach() here: that landing helper has a
         * flat ocean boundary and created the visible horizontal seam.
         * v23 failure depth still moves the craft deeper toward Earth.
         */
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
          baseCraft * 0.48;
      } else if (miss) {
        /*
         * The craft becomes rice-grain small near Earth and even smaller
         * outbound. This fixes the "continent-sized spacecraft" illusion.
         */
        const toPeriapsis =
          smoothstep(
            spaceT / 0.54,
          );

        const outbound =
          smoothstep(
            (
              spaceT -
              0.54
            ) /
              0.46,
          );

        const nearScale =
          mix(
            0.48,
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
            0.54
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
            0.48,
            0.105,
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

        const epilogueClose =
          outcome ===
            "EARTH_REACHED"
            ? smoothstep(
                (
                  timeSinceVisualAtmosphereEntryS -
                  15.0
                ) /
                  3.0,
              )
            : 0;

        const successCloseScale =
          mix(
            0.58,
            1.02,
            epilogueClose,
          );

        craftLength =
          baseCraft *
          mix(
            0.16,
            mix(
              0.48,
              successCloseScale,
              landingClose,
            ),
            atmosphereClose,
          );
      }

      // The former craft remains through the thread-transfer ritual, then
      // shrinks and dissolves before the occupied skiff can depart.
      let craftAlpha = 1;
      if (outcome === "EARTH_REACHED" && latched && !miss &&
          timeSinceVisualAtmosphereEntryS >= STAGE1_SPLASH_S) {
        const splashAge = timeSinceVisualAtmosphereEntryS - STAGE1_SPLASH_S;
        const salvage = smoothstep((splashAge - STAGE1_ABSORB_START_S) /
          (STAGE1_ABSORB_END_S - STAGE1_ABSORB_START_S));
        craftAlpha *= 1 - smoothstep((salvage - 0.69) / 0.31);
        craftLength *= mix(1, 0.24, smoothstep((salvage - 0.22) / 0.78));
      }

      if (miss) {
        craftAlpha =
          1 -
          smoothstep(
            (
              spaceT -
              0.86
            ) /
              0.14,
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
        const successOceanApproach =
          outcome ===
            "EARTH_REACHED" &&
          timeSinceVisualAtmosphereEntryS >=
            10.5;

        if (
          successOceanApproach
        ) {
          // After the splash the hot trail must vanish; its tapered
          // translucent sheet was visible behind the resting vessel.
          if (timeSinceVisualAtmosphereEntryS < STAGE1_SPLASH_S) {
            drawSuccessReentryBloom(
              ctx,
              pose.x,
              pose.y,
              pose.angle,
              craftLength,
              heat,
              playback,
            );
          }
        } else {
          drawFlowLines(
            ctx,
            pose.x,
            pose.y,
            pose.angle,
            craftLength,
            heat,
            playback,
            result?.seed ?? 1,
            entrySteepness,
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
            entrySteepness,
          );
        }
      }

      if (craftAlpha > 0.015 && !burnGone) {
        const landingPalette =
          outcome === "EARTH_REACHED" && latched && !miss
            ? smoothstep((timeSinceVisualAtmosphereEntryS - 10.5) / 3.5)
            : 0;
        const submerging =
          outcome === "EARTH_REACHED" &&
          latched && !miss &&
          timeSinceVisualAtmosphereEntryS > STAGE1_SPLASH_S &&
          timeSinceVisualAtmosphereEntryS < STAGE1_SPLASH_S + STAGE1_ESCAPE_EXIT_S;

        ctx.save();
        if (submerging) {
          // Mask the vehicle pixels ONLY; preserve the WebGL water everywhere.
          clipLandingCraftAboveWater(
            ctx, w, h, pose.x, craftLength,
            timeSinceVisualAtmosphereEntryS - STAGE1_SPLASH_S,
          );
        }
        drawCraft(
          ctx, pose.x, pose.y, pose.angle,
          craftLength, craftAlpha, heat, assistMode, landingPalette,
        );
        if (outcome === "EARTH_REACHED" && latched && !miss &&
            timeSinceVisualAtmosphereEntryS >= STAGE1_SPLASH_S) {
          const age = timeSinceVisualAtmosphereEntryS - STAGE1_SPLASH_S;
          drawRearCraftHatch(ctx, pose, craftLength,
            smoothstep((age - 1.2) / 1.4));
        }
        ctx.restore();
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

      if (
        outcome ===
          "EARTH_REACHED" &&
        latched &&
        !miss
      ) {
        const epilogueDrawStart = performance.now();
        drawStage1ClearSequence(
          ctx,
          w,
          h,
          timeSinceVisualAtmosphereEntryS,
          result?.seed ??
            1,
          pose,
        );
        const perf = renderPerfRef.current;
        const epilogueMs = performance.now() - epilogueDrawStart;
        perf.epilogueAvgMs = perf.epilogueAvgMs
          ? perf.epilogueAvgMs * 0.93 + epilogueMs * 0.07
          : epilogueMs;
      }

      if (
        phase === "result" &&
        outcome &&
        variant !== "stage"
      ) {
        drawResultLabel(ctx, outcome, w, h);
      }
    };

    const loop = (rafNow: number) => {
      const perf = renderPerfRef.current;
      if (perf.lastRafMs > 0) {
        // The refresh interval includes JS + compositing; timing is for
        // adaptive raster quality only, never for animation progress.
        const gap = Math.min(120, rafNow - perf.lastRafMs);
        perf.intervalAvgMs = perf.intervalAvgMs * 0.93 + gap * 0.07;
      }
      perf.lastRafMs = rafNow;

      // Never resize the WebGL framebuffer as an automatic response to
      // dropped frames. Such resizing reallocates GPU memory during the shot
      // and was itself a source of visible pauses. The renderer now has a
      // fixed bounded pixel budget at every viewport size.

      const start = performance.now();
      draw();
      const drawMs = performance.now() - start;
      perf.drawAvgMs = perf.drawAvgMs
        ? perf.drawAvgMs * 0.93 + drawMs * 0.07 : drawMs;
      perf.frameCount += 1;
      // Inspect via canvas dataset without drawing a debugging overlay or
      // spamming the console (which itself can cause frame stutter).
      if (perf.frameCount % 60 === 0) {
        canvas.dataset.frameIntervalMs = perf.intervalAvgMs.toFixed(1);
        canvas.dataset.drawMs = perf.drawAvgMs.toFixed(1);
        canvas.dataset.oceanMs = perf.oceanAvgMs.toFixed(1);
        canvas.dataset.atmosphereMs = perf.atmosphereAvgMs.toFixed(1);
        canvas.dataset.compositeMs = perf.compositeAvgMs.toFixed(1);
        canvas.dataset.epilogueMs = perf.epilogueAvgMs.toFixed(1);
        canvas.dataset.oceanScale = perf.oceanScale.toFixed(2);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  // The RAF loop belongs to the mounted canvas, not to each physics-progress
  // update. The live presentationRef supplies the latest scene on every tick.
  }, [variant]);

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