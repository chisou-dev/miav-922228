import {
  cinematicEarthView,
  earthGrowthRatioAtApproach,
  launchEarthView,
} from "./reentryEarthCamera";
import { launchAnchorPx } from "./reentryCraftProjection";
import { directionNormToScreenHeadingRad } from "./reentrySpaceApproach";
import {
  atmosphereThicknessPx,
  closestApproachIndex,
  gravityPathScalePx,
  gravityScreenPosition,
  hazeEntryTarget,
  missPlaybackToPathT,
  spaceCraftScreenPosition,
  spaceTravelT,
} from "./reentryVisualCausality";
import {
  canvasHeadingFromWorld,
  headingDeltaDeg,
  launchSpaceApproach,
  maxHeadingJumpDeg,
  sampleSpacePoint,
  ATMOSPHERE_HANDOFF_ALTITUDE_M,
  SPACE_START_ALTITUDE_M,
} from "./reentrySpaceApproach";
import { mapLaunchToInput } from "./reentryLaunchInput";
import { runStage1Launch } from "./reentryLaunchPipeline";
import { SPACE_MISS_DURATION_MS } from "./reentryStageTimeline";

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
function smoothstep(v: number): number {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
}

function screenPose(
  angleNorm: number,
  t: number,
  w: number,
  h: number,
) {
  const speed = mapLaunchToInput(0.5, angleNorm, 1).initialSpeedMps;
  const space = launchSpaceApproach(speed, angleNorm);
  const first = space.points[0].state;
  const sampled = sampleSpacePoint(space.points, t)!;
  const launch = launchAnchorPx(w, h);
  const earth = launchEarthView(w, h);
  const travelT = spaceTravelT(t, 0.5, false);
  const traveled = spaceCraftScreenPosition(
    sampled.state.position,
    first.position,
    launch,
    hazeEntryTarget(launch, earth, atmosphereThicknessPx(earth.r)),
    travelT,
  );
  return {
    space,
    x: traveled.x,
    y: traveled.y,
    angle: sampled.screenHeadingRad,
    idleAngle: directionNormToScreenHeadingRad(angleNorm),
  };
}

const sizes = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "mobile", w: 390, h: 844 },
];

for (const size of sizes) {
  const earth = launchEarthView(size.w, size.h);
  if (earth.x > size.w * 0.28 || earth.y < size.h * 0.62 || earth.y > size.h * 0.82) {
    throw new Error(`${size.name} earth not lower-left`);
  }
  const a = screenPose(0.5, 0, size.w, size.h);
  const idle = launchAnchorPx(size.w, size.h);
  const posErr = Math.hypot(a.x - idle.x, a.y - idle.y);
  if (posErr > 0.5) throw new Error(`${size.name} position ${posErr}`);
  const headErr = headingDeltaDeg(a.idleAngle, a.angle);
  if (headErr > 0.5) throw new Error(`${size.name} heading ${headErr}`);
  const b = screenPose(0.5, 0.05, size.w, size.h);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const hx = Math.cos(a.idleAngle);
  const hy = Math.sin(a.idleAngle);
  const align = (dx / len) * hx + (dy / len) * hy;
  if (align < 0.995) throw new Error(`${size.name} alignment ${align}`);
  console.log(
    `${size.name} pos=${posErr.toFixed(4)}px heading=${headErr.toFixed(4)}deg align=${align.toFixed(6)}`,
  );
}

let miss: ReturnType<typeof launchSpaceApproach> | null = null;
for (let n = 0; n < 1; n += 0.05) {
  const speed = mapLaunchToInput(0.5, n, 1).initialSpeedMps;
  const space = launchSpaceApproach(speed, n);
  if (space.kind === "SPACE_MISS") {
    miss = space;
    break;
  }
}
if (!miss) throw new Error("no SPACE_MISS sample");
if (miss.kind !== "SPACE_MISS") throw new Error("expected miss");
console.log("SPACE miss samples", miss.points.length, "startAlt", miss.points[0].altitudeM);

const launchedMiss = runStage1Launch(0.4, 0.0, 7);
if (launchedMiss.space.kind === "SPACE_MISS") {
  if (launchedMiss.result.outcome !== "SKIP") {
    throw new Error("SPACE_MISS must be SKIP");
  }
}

const jump = maxHeadingJumpDeg(miss.points);
if (jump > 15) throw new Error(`heading jump ${jump}`);
const mid = miss.points[Math.floor(miss.points.length / 2)].state;
const r = Math.hypot(mid.position.x, mid.position.y) || 1;
const erx = mid.position.x / r;
const ery = mid.position.y / r;
const radialOut =
  mid.velocity.x * erx + mid.velocity.y * ery;
void radialOut;
const later = miss.points[Math.min(miss.points.length - 1, Math.floor(miss.points.length * 0.8))].state;
const earlier = miss.points[Math.floor(miss.points.length * 0.2)].state;
const h0 = Math.atan2(earlier.velocity.y, earlier.velocity.x);
const h1 = Math.atan2(later.velocity.y, later.velocity.x);
if (headingDeltaDeg(h0, h1) < 0.5) {
  throw new Error("flyby heading did not change");
}
console.log("gravity jumpDeg", jump.toFixed(3));

let entry = null as ReturnType<typeof launchSpaceApproach> | null;
for (let n = 0; n <= 1; n += 0.02) {
  const speed = mapLaunchToInput(0.55, n, 1).initialSpeedMps;
  const space = launchSpaceApproach(speed, n);
  if (space.kind === "ATMOSPHERE_ENTRY") {
    entry = space;
    break;
  }
}
if (!entry || entry.kind !== "ATMOSPHERE_ENTRY") {
  throw new Error("no ATMOSPHERE_ENTRY sample");
}
if (Math.abs(entry.entry.state.elapsedS) < 0) throw new Error("bad time");
if (entry.points[entry.points.length - 1].altitudeM > ATMOSPHERE_HANDOFF_ALTITUDE_M + 2000) {
  throw new Error("handoff altitude too high");
}
if (!Number.isFinite(entry.entry.speedMps) || !Number.isFinite(entry.entry.gammaRad)) {
  throw new Error("non-finite entry");
}
console.log(
  "handoff alt",
  entry.points[entry.points.length - 1].altitudeM,
  "speed",
  entry.entry.speedMps,
);

function destructionAmount(timeSinceAtmosphereEntryS: number, outcome: string) {
  if (outcome !== "BURN" && outcome !== "BREAK") return 0;
  if (timeSinceAtmosphereEntryS < 3) return 0;
  return smoothstep((timeSinceAtmosphereEntryS - 3) / 7);
}
if (destructionAmount(2.9, "BURN") !== 0) throw new Error("early burn");
if (destructionAmount(3.0, "BURN") !== 0) throw new Error("burn at 3s should start 0");
if (destructionAmount(4.2, "BURN") <= 0) throw new Error("late burn");
console.log("start altitude", SPACE_START_ALTITUDE_M, "handoff", ATMOSPHERE_HANDOFF_ALTITUDE_M);
const ratio50 = earthGrowthRatioAtApproach(0.5);
const ratio85 = earthGrowthRatioAtApproach(0.85);
if (ratio50 > 1.2) throw new Error(`earth growth at 50% ${ratio50}`);
const travel50 = spaceTravelT(0.5, 0.5, false);
const travel70 = spaceTravelT(0.7, 0.5, false);
if (travel70 < 0.55) throw new Error(`travel at 70% ${travel70}`);
console.log(
  "v15 earth@50=",
  ratio50.toFixed(4),
  "earth@85=",
  ratio85.toFixed(4),
  "travel@50=",
  travel50.toFixed(4),
  "travel@70=",
  travel70.toFixed(4),
);
console.log("v15 checks ok");

if (SPACE_MISS_DURATION_MS < 6700 || SPACE_MISS_DURATION_MS > 8800) {
  throw new Error(`SPACE_MISS duration ${SPACE_MISS_DURATION_MS}`);
}

const missW = 1280;
const missH = 720;
const missLaunch = launchAnchorPx(missW, missH);
const missEarth = cinematicEarthView({
  w: missW,
  h: missH,
  idle: false,
  miss: true,
  travelT: 1,
  spaceT: 1,
});
const startEarth = launchEarthView(missW, missH);
if (missEarth.r >= startEarth.r * 1.08) {
  throw new Error(`earth did not shrink outbound ${missEarth.r}`);
}

const periIdx = closestApproachIndex(miss.points);
const firstPt = miss.points[0].state;
const periPt = miss.points[periIdx].state;
const periScreen = hazeEntryTarget(
  missLaunch,
  { x: startEarth.x, y: startEarth.y, r: startEarth.r * 1.08 },
  atmosphereThicknessPx(startEarth.r * 1.08),
);
const gScale = gravityPathScalePx(
  firstPt.position,
  periPt.position,
  missLaunch,
  periScreen,
);

const missPositions: { t: number; x: number; y: number }[] = [];
for (let ms = 0; ms <= SPACE_MISS_DURATION_MS; ms += 500) {
  const spaceT = ms / SPACE_MISS_DURATION_MS;
  const pathT = missPlaybackToPathT(spaceT, periIdx, miss.points.length);
  const sampled = sampleSpacePoint(miss.points, pathT);
  if (!sampled) throw new Error("missing miss sample");
  const pos = gravityScreenPosition(
    sampled.state.position,
    firstPt.position,
    missLaunch,
    gScale,
  );
  missPositions.push({ t: spaceT, x: pos.x, y: pos.y });
}
for (let i = 1; i < missPositions.length; i++) {
  const prev = missPositions[i - 1];
  const cur = missPositions[i];
  const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
  if (prev.t < 0.84 && dist < 0.25) {
    throw new Error(`SPACE_MISS freeze at t=${prev.t} Δ=${dist}`);
  }
}

const last = missPositions[missPositions.length - 1];
const periScreened = gravityScreenPosition(
  periPt.position,
  firstPt.position,
  missLaunch,
  gScale,
);
const outboundTravel = Math.hypot(last.x - periScreened.x, last.y - periScreened.y);
if (outboundTravel < 40) {
  throw new Error(`outbound travel too small ${outboundTravel}`);
}

let headingJump = 0;
let prevHeading = 0;
for (let i = 0; i < miss.points.length; i++) {
  const heading = canvasHeadingFromWorld(miss.points[i].state.velocity);
  if (i > 0) {
    headingJump = Math.max(headingJump, headingDeltaDeg(prevHeading, heading));
  }
  prevHeading = heading;
}
if (headingJump > 8.01) {
  throw new Error(`canvas heading jump ${headingJump}`);
}

void spaceCraftScreenPosition;
console.log(
  "v16 miss durationMs",
  SPACE_MISS_DURATION_MS,
  "outboundPx",
  outboundTravel.toFixed(1),
  "headingJump",
  headingJump.toFixed(3),
);
console.log("v16 checks ok");
