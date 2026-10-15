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
 * NASA Blue Marble: cloud-free land/ocean/ice underneath a small amount of
 * cloud composite. Never apply a white veil to the entire close Earth.
 * The 8K source is only requested on desktop; 2K loads first everywhere.
 * The distant SPACE photograph is untouched.
 */
const EARTH_SURFACE_SOURCE =
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg";
const EARTH_SURFACE_HD_SOURCE =
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_8192.png";
const EARTH_SURFACE_CLOUD_SOURCE =
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57735/land_ocean_ice_cloud_2048.jpg";

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

  const fade = (1 - horizonMix * 0.90) * stars;
  const clockS = typeof performance !== "undefined" ? performance.now() / 1000 : 0;

  ctx.save();
  ctx.globalAlpha = fade;

  for (let i = 0; i < 104; i++) {
    const rx = hash01(0x51a2, i * 7 + 1);
    const ry = hash01(0x71c9, i * 11 + 3);
    const rb = hash01(0x91ef, i * 13 + 5);
    const phase = hash01(0xa217, i * 17 + 9) * Math.PI * 2;
    const x = rx * w;
    const y = ry * h;
    const bright = i % 19 === 0;
    const cool = i % 31 === 0;
    const warm = i % 37 === 0;

    const shimmer =
      0.88 +
      Math.sin(clockS * (1.7 + rb * 0.9) + phase) * (bright ? 0.070 : 0.026) +
      Math.sin(clockS * (4.9 + rb * 2.0) + phase * 1.71) *
        (bright || cool || warm ? 0.045 : 0.013) +
      Math.sin(clockS * (10.7 + rb * 3.4) + phase * 2.37) *
        (bright ? 0.022 : 0.006);

    const alpha =
      (bright ? 0.74 : cool || warm ? 0.54 : 0.15 + rb * 0.18) * shimmer;
    const sizeJitter =
      1 + Math.sin(clockS * (3.1 + rb * 2.8) + phase) * (bright ? 0.09 : 0.025);
    const radius =
      (bright ? 1.05 + rb * 0.66 : cool || warm ? 0.72 + rb * 0.34 : 0.32 + rb * 0.36) *
      sizeJitter;

    let color = `rgba(234,241,248,${alpha})`;
    if (cool) color = `rgba(151,198,255,${alpha})`;
    else if (warm) color = `rgba(255,171,128,${alpha * 0.90})`;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (bright || cool || warm) {
      const flare = (bright ? 3.3 + rb * 2.6 : 1.9 + rb * 1.5) * sizeJitter;
      ctx.strokeStyle = cool
        ? `rgba(160,208,255,${alpha * 0.27})`
        : warm
          ? `rgba(255,190,154,${alpha * 0.22})`
          : `rgba(230,241,250,${alpha * 0.25})`;
      ctx.lineWidth = 0.46;
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

function drawAtmosphereVolume(
  ctx: CanvasRenderingContext2D,
  earth: HTMLImageElement | null,
  cloudEarth: HTMLImageElement | null,
  w: number,
  h: number,
  atmosphereSceneMix: number,
  timeSinceEntryS: number,
  horizonAngle: number,
  surfacePhase: number,
  entrySteepness: number,
): void {
  if (atmosphereSceneMix <= 0.001) return;

  const mixIn = clamp01(atmosphereSceneMix);
  const deep = smoothstep((timeSinceEntryS - 1.0) / 8.2);
  const surfaceReveal = smoothstep((timeSinceEntryS - 1.2) / 5.8);

  /*
   * Screen-space atmosphere field.
   *
   * Keep the top of the phone visually in space even when the local
   * horizon is tilted. The previous version rotated this gradient together
   * with the horizon, which could move the bright lower-atmosphere colors
   * into the upper part of the screen.
   */
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "rgba(0,2,8,1)");
  sky.addColorStop(0.28, "rgba(1,6,16,1)");
  sky.addColorStop(0.58, "rgba(4,18,42,1)");
  sky.addColorStop(0.80, "rgba(12,47,86,1)");
  sky.addColorStop(1, "rgba(44,96,138,1)");

  ctx.save();
  ctx.globalAlpha = mixIn;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  drawAtmosphericMoon(
    ctx,
    w,
    h,
    mixIn,
    Date.now(),
  );

  /*
   * Rotate only the curved Earth / atmosphere geometry.
   * This preserves the physical-looking tilted horizon while the upper
   * screen remains dark.
   */
  ctx.save();
  const cx = w * 0.5;
  const cy = h * 0.5;
  ctx.translate(cx, cy);
  ctx.rotate(horizonAngle);
  ctx.translate(-cx, -cy);

  const pad = Math.max(w, h) * 0.75;
  const maxDim = Math.max(w, h);
  const steep = clamp01(entrySteepness);
  const startHorizon = h * mix(0.72, 0.58, steep);
  const horizonTop = mix(startHorizon, h * 0.30, deep);
  const earthR = maxDim * mix(1.02, 1.76, deep);
  const phaseAngle = surfacePhase * Math.PI * 2;
  const earthX = w * (0.50 + Math.sin(phaseAngle) * 0.055);
  const earthY = horizonTop + earthR;

  ctx.save();
  ctx.beginPath();
  ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = mixIn * mix(0.08, 0.98, surfaceReveal);


  if (earth && earth.naturalWidth > 0) {
    // Share the same crop for the cloud-free map and cloud composite, so the
    // occasional clouds follow the terrain instead of sliding across it.
    const cropX01 = clamp01(0.50 + Math.sin(phaseAngle) * 0.46);
    const cropY01 = clamp01(0.50 + Math.cos(phaseAngle * 0.73) * 0.28);
    const drawMap = (image: HTMLImageElement, opacity: number): void => {
      const cropSize = Math.min(image.naturalWidth * 0.48, image.naturalHeight * 0.92);
      const sx = Math.max(0, image.naturalWidth - cropSize) * cropX01;
      const sy = Math.max(0, image.naturalHeight - cropSize) * cropY01;
      ctx.globalAlpha = opacity;
      ctx.drawImage(
        image, sx, sy, cropSize, cropSize,
        earthX - earthR, earthY - earthR, earthR * 2, earthR * 2
      );
    };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const baseOpacity = mixIn * mix(0.08, 0.98, surfaceReveal);
    ctx.filter = "saturate(1.16) contrast(1.13)";
    drawMap(earth, baseOpacity);
    // Sparse cloud veil (about 16% of the original composite), so seas and
    // land remain visible. The already textured Earth supplies the detail.
    if (cloudEarth && cloudEarth.naturalWidth > 0) {
      ctx.filter = "saturate(0.80) contrast(0.95)";
      drawMap(cloudEarth, baseOpacity * 0.16);
    }
    ctx.filter = "none";
    ctx.globalAlpha = baseOpacity;
  } else {
    const ocean = ctx.createLinearGradient(0, horizonTop, 0, h);
    ocean.addColorStop(0, "#567f9c");
    ocean.addColorStop(0.35, "#255674");
    ocean.addColorStop(1, "#071d31");
    ctx.fillStyle = ocean;
    ctx.fillRect(-pad, horizonTop, w + pad * 2, h + pad);
  }

  const blueCast = ctx.createLinearGradient(0, horizonTop, 0, h);
  blueCast.addColorStop(0, `rgba(42,112,180,${mix(0.26, 0.08, surfaceReveal)})`);
  blueCast.addColorStop(0.34, `rgba(20,73,128,${mix(0.20, 0.06, surfaceReveal)})`);
  blueCast.addColorStop(1, "rgba(6,24,45,0.08)");
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = blueCast;
  ctx.fillRect(-pad, horizonTop, w + pad * 2, h + pad);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const haze = ctx.createRadialGradient(
    earthX, earthY, earthR * 0.995,
    earthX, earthY, earthR * 1.020,
  );
  haze.addColorStop(0, "rgba(100,190,255,0)");
  haze.addColorStop(0.42, `rgba(115,205,255,${0.055 + mixIn * 0.10})`);
  haze.addColorStop(0.70, `rgba(205,238,255,${0.070 + mixIn * 0.12})`);
  haze.addColorStop(1, "rgba(60,135,235,0)");
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(earthX, earthY, earthR * 1.021, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
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
  const breath = Math.sin(time * 0.94) * 0.018;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";

  // Organic tapered bodies with independent motion, no suckers or outlines.
  const drawTentacle = (i: number): void => {
    const side = (i - 2.5) / 2.5;
    const wave = Math.sin(time * (0.72 + i * 0.07) + i * 1.19);
    const rootX = scale * side * 0.28;
    const rootY = -scale * (0.17 + (i % 3) * 0.015);
    const tipX = scale * (side * 0.51 + wave * (0.095 + (i % 2) * 0.028));
    const tipY = scale * (0.57 + (i % 3) * 0.085 + stretch * 0.65);
    const rootW = scale * (0.070 + (i % 3) * 0.010);
    const endW = scale * 0.010;
    const tentacle = new Path2D();
    tentacle.moveTo(rootX - rootW, rootY);
    tentacle.bezierCurveTo(
      rootX - rootW * 1.65, scale * 0.16,
      tipX - scale * (0.085 + (i % 2) * 0.018), scale * 0.39,
      tipX - endW, tipY
    );
    tentacle.quadraticCurveTo(tipX, tipY + endW * 0.7, tipX + endW, tipY);
    tentacle.bezierCurveTo(
      tipX + scale * 0.075, scale * 0.36,
      rootX + rootW * 1.2, scale * 0.075,
      rootX + rootW, rootY
    );
    tentacle.closePath();

    const limbLight = ctx.createLinearGradient(
      rootX - rootW * 1.6, rootY,
      rootX + rootW * 1.7, rootY + scale * 0.18
    );
    limbLight.addColorStop(0, "#614221");
    limbLight.addColorStop(0.24, "#c58924");
    limbLight.addColorStop(0.51, "#ffe05a");
    limbLight.addColorStop(0.76, "#de9f2c");
    limbLight.addColorStop(1, "#805022");
    ctx.fillStyle = limbLight;
    ctx.fill(tentacle);

    ctx.save();
    ctx.clip(tentacle);
    const blue = ctx.createRadialGradient(
      tipX - scale * 0.025, scale * 0.24, 0,
      tipX - scale * 0.025, scale * 0.24, scale * 0.23
    );
    blue.addColorStop(0, i % 3 === 0 ? "rgba(31,147,207,0.47)" : "rgba(38,147,205,0.22)");
    blue.addColorStop(0.48, "rgba(76,188,221,0.13)");
    blue.addColorStop(1, "rgba(76,188,221,0)");
    ctx.fillStyle = blue;
    ctx.fillRect(-scale, -scale, 2 * scale, 2 * scale);
    const sheen = ctx.createRadialGradient(
      rootX - rootW * 0.55, scale * 0.13, 0,
      rootX - rootW * 0.55, scale * 0.13, scale * 0.18
    );
    sheen.addColorStop(0, "rgba(255,254,219,0.28)");
    sheen.addColorStop(1, "rgba(255,254,219,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-scale, -scale, 2 * scale, 2 * scale);
    ctx.restore();
  };
  for (const i of [0, 2, 5]) drawTentacle(i);

  ctx.save();
  ctx.translate(0, -scale * 0.49);
  ctx.scale(1 + breath, 1 - breath * 0.65);
  const mantle = new Path2D();
  mantle.moveTo(-scale * 0.255, scale * 0.28);
  mantle.bezierCurveTo(-scale * 0.42, scale * 0.14, -scale * 0.39, -scale * 0.19, -scale * 0.23, -scale * 0.34);
  mantle.bezierCurveTo(-scale * 0.055, -scale * 0.47, scale * 0.20, -scale * 0.43, scale * 0.34, -scale * 0.18);
  mantle.bezierCurveTo(scale * 0.42, scale * 0.045, scale * 0.29, scale * 0.26, scale * 0.15, scale * 0.31);
  mantle.quadraticCurveTo(-scale * 0.015, scale * 0.365, -scale * 0.255, scale * 0.28);
  mantle.closePath();
  const skin = ctx.createRadialGradient(
    -scale * 0.14, -scale * 0.17, scale * 0.015,
    scale * 0.17, scale * 0.21, scale * 0.61
  );
  skin.addColorStop(0, "#fff6b0");
  skin.addColorStop(0.17, "#ffe764");
  skin.addColorStop(0.42, "#eebb37");
  skin.addColorStop(0.68, "#ba7b29");
  skin.addColorStop(0.88, "#704921");
  skin.addColorStop(1, "#2e251e");
  ctx.fillStyle = skin;
  ctx.fill(mantle);
  ctx.save();
  ctx.clip(mantle);
  for (const patch of [
    { x: 0.25, y: -0.045, r: 0.29, a: 0.45 },
    { x: -0.31, y: 0.18, r: 0.22, a: 0.28 },
  ]) {
    const grad = ctx.createRadialGradient(
      patch.x * scale, patch.y * scale, 0,
      patch.x * scale, patch.y * scale, patch.r * scale
    );
    grad.addColorStop(0, "rgba(29,119,211," + patch.a + ")");
    grad.addColorStop(0.48, "rgba(63,191,221," + (patch.a * 0.38) + ")");
    grad.addColorStop(1, "rgba(63,191,221,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(-scale, -scale, scale * 2, scale * 2);
  }
  for (const [px, py, rr, a] of [
    [-0.21, -0.22, 0.21, 0.75],
    [0.24, 0.09, 0.10, 0.22],
  ]) {
    const sheen = ctx.createRadialGradient(
      scale * px, scale * py, 0, scale * px, scale * py, scale * rr
    );
    sheen.addColorStop(0, "rgba(255,255,243," + a + ")");
    sheen.addColorStop(0.28, "rgba(255,248,211," + (a * 0.22) + ")");
    sheen.addColorStop(1, "rgba(255,248,211,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-scale, -scale, 2 * scale, 2 * scale);
  }
  ctx.restore();

  for (const side of [-1, 1]) {
    const ex = side * scale * 0.122;
    const ey = scale * 0.08;
    ctx.fillStyle = "rgba(110,68,24,0.55)";
    ctx.beginPath();
    ctx.ellipse(ex, ey, scale * 0.070, scale * 0.085, -side * 0.17, 0, Math.PI * 2);
    ctx.fill();
    const eye = ctx.createRadialGradient(
      ex - scale * 0.012, ey - scale * 0.019, 0,
      ex + scale * 0.01, ey + scale * 0.012, scale * 0.067
    );
    eye.addColorStop(0, "#26374a");
    eye.addColorStop(0.38, "#090f1b");
    eye.addColorStop(0.80, "#01040b");
    eye.addColorStop(1, "#513f2a");
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.ellipse(ex, ey, scale * 0.046, scale * 0.061, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,242,0.84)";
    ctx.beginPath();
    ctx.arc(ex - scale * 0.017, ey - scale * 0.025, scale * 0.010, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  for (const i of [1, 3, 4]) drawTentacle(i);
  ctx.restore();
}

function drawEscapeSkiff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
  tilt = -0.08,
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
  skin.addColorStop(0, "#805020");
  skin.addColorStop(0.20, "#d49326");
  skin.addColorStop(0.53, "#ffe16c");
  skin.addColorStop(0.78, "#e9b33b");
  skin.addColorStop(1, "#7d704e");
  ctx.fillStyle = skin;
  ctx.fill(arm);
  ctx.save();
  ctx.clip(arm);
  const wet = ctx.createRadialGradient(
    bendX - side * scale * 0.045, bendY - scale * 0.035, 0,
    bendX - side * scale * 0.045, bendY - scale * 0.035, scale * 0.23
  );
  wet.addColorStop(0, "rgba(255,255,229,0.49)");
  wet.addColorStop(0.30, "rgba(77,182,228,0.20)");
  wet.addColorStop(1, "rgba(77,182,228,0)");
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
    "rgba(255,246,122,0.90)",
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



function drawStage1ClearSequence(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSinceVisualS: number,
  seed: number,
): void {
  const splashStartS = 14.15;

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
        3.2,
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
    i < 34;
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

  const steamEnvelope =
    steamIn *
    (
      1 -
      smoothstep(
        (
          splashAge -
          5.5
        ) /
          14.5,
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
      i < 34;
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

      ctx.filter =
        "blur(" +
        Math.max(
          1.5,
          minDim *
            (
              0.0035 +
              life * 0.004
            ),
        ) +
        "px)";

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
   *  4) another tentacle absorbs the original craft;
   *  5) the alien boards and the skiff departs.
   *
   * Everything stays in the same ocean shot; there is no cut to a still image.
   */
  const alienRise =
    smoothstep(
      (
        timeSinceVisualS -
        17.0
      ) /
        2.2,
    );

  const pointGesture =
    smoothstep(
      (
        timeSinceVisualS -
        19.1
      ) /
        1.25,
    ) *
    (
      1 -
      smoothstep(
        (
          timeSinceVisualS -
          23.2
        ) /
          0.8,
      )
    );

  const vehicleFormation =
    smoothstep(
      (
        timeSinceVisualS -
        20.4
      ) /
        3.0,
    );

  const absorbGesture =
    smoothstep(
      (
        timeSinceVisualS -
        24.0
      ) /
        1.15,
    ) *
    (
      1 -
      smoothstep(
        (
          timeSinceVisualS -
          28.5
        ) /
          0.9,
      )
    );

  const absorbCraft =
    smoothstep(
      (
        timeSinceVisualS -
        25.1
      ) /
        3.2,
    );

  const boardSkiff =
    smoothstep(
      (
        timeSinceVisualS -
        28.2
      ) /
        2.2,
    );

  const departSkiff =
    smoothstep(
      (
        timeSinceVisualS -
        30.5
      ) /
        5.0,
    );

  const alienScale =
    minDim *
    0.034;

  const sourceAlienX =
    craftX +
    minDim *
      0.032;

  const sourceAlienY =
    waterY -
    minDim *
      mix(
        0.006,
        0.043,
        alienRise,
      );

  const skiffRestX =
    craftX +
    minDim *
      0.245;

  const skiffRestY =
    waterY -
    minDim *
      0.038;

  const skiffX =
    skiffRestX +
    departSkiff *
      w *
      0.40;

  const skiffY =
    skiffRestY -
    departSkiff *
      h *
      0.47;

  const boardX =
    mix(
      sourceAlienX,
      skiffX -
        minDim *
        0.018,
      boardSkiff,
    );

  const boardY =
    mix(
      sourceAlienY,
      skiffY -
        minDim *
        0.038,
      boardSkiff,
    );

  const alienAlpha =
    alienRise *
    (
      1 -
      smoothstep(
        (
          departSkiff -
          0.90
        ) /
          0.10,
      )
    );

  if (
    alienAlpha >
    0.001
  ) {
    // Only a tiny contact shadow where the creature climbs from the sea.
    // Do not obscure or repaint the underlying WebGL water.
    if (boardSkiff < 0.18) {
      const amount = alienAlpha * (1 - smoothstep(boardSkiff / 0.18));
      ctx.save();
      const shadow = ctx.createRadialGradient(
        sourceAlienX, waterY + minDim * 0.012, 0,
        sourceAlienX, waterY + minDim * 0.012, minDim * 0.05
      );
      shadow.addColorStop(0, "rgba(5,24,40," + (amount * 0.24) + ")");
      shadow.addColorStop(0.60, "rgba(31,105,130," + (amount * 0.09) + ")");
      shadow.addColorStop(1, "rgba(31,105,130,0)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(
        sourceAlienX, waterY + minDim * 0.012,
        minDim * 0.05, minDim * 0.009, 0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
    drawLiquidAlien(
      ctx,
      boardX,
      boardY,
      alienScale,
      alienAlpha,
      mix(
        0.12,
        -0.06,
        boardSkiff,
      ),
    );

    if (
      pointGesture >
      0.001 &&
      boardSkiff <
        0.18
    ) {
      const pointerTip =
        drawAlienRaisedTentacle(
          ctx,
          boardX,
          boardY,
          alienScale,
          1,
          pointGesture,
          boardX +
            minDim *
            0.075,
          boardY -
            minDim *
            0.080,
          alienAlpha,
        );

      drawAlienFluidVehicleFormation(
        ctx,
        pointerTip.x,
        pointerTip.y,
        skiffRestX,
        skiffRestY,
        vehicleFormation,
        alienAlpha,
        alienScale,
        seed,
      );
    }

    if (
      absorbGesture >
      0.001 &&
      boardSkiff <
        0.22
    ) {
      const absorbTip =
        drawAlienRaisedTentacle(
          ctx,
          boardX,
          boardY,
          alienScale,
          -1,
          absorbGesture,
          craftX +
            minDim *
            0.008,
          waterY -
            minDim *
            0.035,
          alienAlpha,
        );

      drawCraftAbsorption(
        ctx,
        craftX,
        waterY -
          minDim *
          0.015,
        absorbTip.x,
        absorbTip.y,
        minDim *
          0.12,
        absorbCraft,
        seed,
      );
    }
  }

  const skiffAppear =
    smoothstep(
      (
        vehicleFormation -
        0.42
      ) /
        0.58,
    );

  if (
    skiffAppear >
    0.001
  ) {
    const skiffScale =
      minDim *
      mix(
        0.030,
        0.075,
        skiffAppear,
      ) *
      mix(
        1,
        0.72,
        departSkiff,
      );

if (departSkiff < 0.16) {
      // A tiny shadow on the actual water; no artificial dark foreground.
      const amount = skiffAppear * (1 - smoothstep(departSkiff / 0.16));
      ctx.save();
      const shade = ctx.createRadialGradient(
        skiffRestX, waterY + minDim * 0.013, 0,
        skiffRestX, waterY + minDim * 0.013, skiffScale * 1.25
      );
      shade.addColorStop(0, "rgba(3,21,37," + (amount * 0.35) + ")");
      shade.addColorStop(0.53, "rgba(14,78,100," + (amount * 0.13) + ")");
      shade.addColorStop(1, "rgba(14,78,100,0)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(
        skiffRestX, waterY + minDim * 0.013,
        skiffScale * 1.25, skiffScale * 0.17, 0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
    drawEscapeSkiff(
      ctx,
      skiffX,
      skiffY,
      skiffScale,
      skiffAppear *
        (
          1 -
          smoothstep(
            (
              departSkiff -
              0.94
            ) /
              0.06,
          )
        ),
      mix(
        -0.08,
        -0.28,
        departSkiff,
      ),
    );


    if (departSkiff > 0.02 && departSkiff < 0.87) {
      // Broad and short displaced-air wake, never a straight light ray.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const amount = 1 - smoothstep((departSkiff - 0.60) / 0.27);
      const wx = skiffX - skiffScale * 0.85;
      const wy = skiffY + skiffScale * 0.14;
      const wake = ctx.createRadialGradient(
        wx, wy, 0, wx, wy, skiffScale * 1.25
      );
      wake.addColorStop(0, "rgba(143,222,243," + (0.15 * amount) + ")");
      wake.addColorStop(0.40, "rgba(96,171,222," + (0.08 * amount) + ")");
      wake.addColorStop(1, "rgba(96,171,222,0)");
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.ellipse(
        wx, wy, skiffScale * 1.25, skiffScale * 0.28,
        -0.22, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }



  const clearIn =
    smoothstep(
      (
        timeSinceVisualS -
        21.2
      ) /
        0.90,
    );

  const clearOut =
    1 -
    smoothstep(
      (
        timeSinceVisualS -
        36.2
      ) /
        0.80,
    );

  const clearAlpha =
    clearIn *
    clearOut;

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
    cx, cy, r * 1.045,
  );
  haze.addColorStop(0, "rgba(125,205,255,0)");
  haze.addColorStop(0.38, `rgba(125,205,255,${0.022 + hazeStrength * 0.035})`);
  haze.addColorStop(0.60, `rgba(178,225,255,${0.036 + hazeStrength * 0.050})`);
  haze.addColorStop(0.80, `rgba(85,160,245,${0.018 + hazeStrength * 0.030})`);
  haze.addColorStop(1, "rgba(55,120,235,0)");

  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.045, 0, Math.PI * 2);
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
    for (const [px, py, r, color] of [
      [-0.28, -0.22, 0.38, "rgba(239,68,93,0.52)"],
      [0.20, 0.18, 0.30, "rgba(219,46,83,0.37)"],
      [-0.03, 0.27, 0.28, "rgba(58,216,135,0.45)"],
      [0.40, -0.18, 0.24, "rgba(71,218,154,0.37)"],
    ] as const) {
      const bleed = ctx.createRadialGradient(
        length * px, width * py, 0,
        length * px, width * py, length * r
      );
      bleed.addColorStop(0, color);
      bleed.addColorStop(0.42, color.slice(0, color.lastIndexOf(",")) + ",0.12)");
      bleed.addColorStop(1, "rgba(0,0,0,0)");
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
  angleNorm: number;
  spaceApproach: SpaceApproachResult | null;
  spaceShare: number;
  powerNorm: number;
  variant: ReentryArtVariant;
  assistMode?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earthRef = useRef<HTMLImageElement | null>(null);
  const earthSurfaceRef = useRef<HTMLImageElement | null>(null);
  const earthSurfaceCloudRef = useRef<HTMLImageElement | null>(null);
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

  useEffect(() => {
    let live = true;

    void loadImage(EARTH_SOURCE)
      .then((img) => {
        if (live) earthRef.current = img;
      })
      .catch(() => {
        if (live) earthRef.current = null;
      });

    void loadImage(EARTH_SURFACE_SOURCE)
      .then((img) => {
        if (live) earthSurfaceRef.current = img;
      })
      .catch(() => {
        if (live) earthSurfaceRef.current = null;
      });

    // 8192px cloud-free detail on desktop; retain the 2048px map on mobile.
    if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      void loadImage(EARTH_SURFACE_HD_SOURCE)
        .then((img) => {
          if (live) earthSurfaceRef.current = img;
        })
        .catch(() => {
          // The already loaded 2K map remains usable.
        });
    }

    void loadImage(EARTH_SURFACE_CLOUD_SOURCE)
      .then((img) => {
        if (live) earthSurfaceCloudRef.current = img;
      })
      .catch(() => {
        if (live) earthSurfaceCloudRef.current = null;
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

    return () => {
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

      const inboundDurationMs =
        spaceInboundDurationMs(
          powerNorm,
        );

      const upperAtmosphereDurationS =
        atmosphereTransitionDurationS(
          powerNorm,
        );

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
      const launchHeading = directionNormToScreenHeadingRad(angleNorm);

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
        timeSinceVisualAtmosphereEntryS >= 17.80
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

      const horizonAngle = lineAngleNearHorizontal(contactPolar + Math.PI / 2);

      const atmosphereEntryHeading = latchPoseRef.current
        ? descendingCameraHeading(
            horizonAngle,
            physicalEntryGamma,
            latchPoseRef.current.angle,
          )
        : launchHeading;

      const entrySteepness = clamp01((physicalEntryGamma - 0.02) / 0.62);
      const surfacePhase = (((contactPolar / (Math.PI * 2)) % 1) + 1) % 1;

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

        const atmosphericAnchor = {
          x: w * mix(0.58, 0.66, entrySteepness),
          y: h * mix(0.28, 0.37, entrySteepness),
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
        drawAtmosphereVolume(
          ctx,
          earthSurfaceRef.current ??
            earthRef.current,
          earthSurfaceCloudRef.current,
          w,
          h,
          atmosphereSceneMix,
          timeSinceVisualAtmosphereEntryS,
          horizonAngle,
          surfacePhase,
          entrySteepness,
        );

        const showSurfaceApproach =
          outcome ===
            "EARTH_REACHED" &&
          timeSinceVisualAtmosphereEntryS >=
            10.5;

        if (
          showSurfaceApproach
        ) {
          const oceanSurface =
            oceanWebGLRef.current?.render({
              width: w,
              height: h,
              timeS:
                timeSinceVisualAtmosphereEntryS,
              sceneSeed:
                result?.seed ??
                1,
            }) ??
            null;

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
            timeSinceVisualAtmosphereEntryS,
            oceanSurface,
          );
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
          baseCraft * 0.72;
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

      let craftAlpha = 1;

      if (
        outcome ===
          "EARTH_REACHED" &&
        latched &&
        !miss
      ) {
        const absorbOriginalCraft =
          smoothstep(
            (
              timeSinceVisualAtmosphereEntryS -
              25.1
            ) /
              3.2,
          );

        craftAlpha *=
          1 -
          absorbOriginalCraft;

        craftLength *=
          mix(
            1,
            0.30,
            absorbOriginalCraft,
          );
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
          if (timeSinceVisualAtmosphereEntryS < 14.15) {
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
          timeSinceVisualAtmosphereEntryS > 14.15 &&
          timeSinceVisualAtmosphereEntryS < 28.6;

        ctx.save();
        if (submerging) {
          // Mask the vehicle pixels ONLY; preserve the WebGL water everywhere.
          clipLandingCraftAboveWater(
            ctx, w, h, pose.x, craftLength,
            timeSinceVisualAtmosphereEntryS - 14.15,
          );
        }
        drawCraft(
          ctx, pose.x, pose.y, pose.angle,
          craftLength, craftAlpha, heat, assistMode, landingPalette,
        );
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
        drawStage1ClearSequence(
          ctx,
          w,
          h,
          timeSinceVisualAtmosphereEntryS,
          result?.seed ??
            1,
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
    assistMode,
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