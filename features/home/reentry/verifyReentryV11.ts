import {
  cinematicEarthView,
  earthGrowthRatioAtApproach,
  launchEarthView,
} from "./reentryEarthCamera";
import { launchAnchorPx } from "./reentryCraftProjection";
import {
  closestApproachIndex,
  missPlaybackToPathT,
  similaritySpacePose,
  spaceTravelT,
} from "./reentryVisualCausality";
import {
  canvasHeadingFromWorld,
  directionNormToScreenHeadingRad,
  headingDeltaDeg,
  launchSpaceApproach,
  maxHeadingJumpDeg,
  sampleSpacePoint,
  screenMatchedStartAltitudeM,
  ATMOSPHERE_HANDOFF_ALTITUDE_M,
  SPACE_EARTH_RADIUS_M,
  SPACE_START_ALTITUDE_M,
} from "./reentrySpaceApproach";
import { mapLaunchToInput, wrap01 } from "./reentryLaunchInput";
import { runStage1Launch } from "./reentryLaunchPipeline";
import {
  SPACE_MISS_DURATION_MS,
  destructionAmountFromEntryS,
  failureDestructionStartS,
} from "./reentryStageTimeline";

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
function smoothstep(v: number): number {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
}

function screenHeadingToNorm(heading: number): number {
  return wrap01((heading + Math.PI / 2) / (Math.PI * 2));
}

function geometry(w: number, h: number) {
  const launch = launchAnchorPx(w, h);
  const earth = launchEarthView(w, h);
  const centerDistancePx = Math.hypot(launch.x - earth.x, launch.y - earth.y);
  const startAltitudeM = screenMatchedStartAltitudeM(earth.r, centerDistancePx);
  const earthBearing = Math.atan2(earth.y - launch.y, earth.x - launch.x);
  return { launch, earth, centerDistancePx, startAltitudeM, earthBearing };
}

function poseAt(
  space: ReturnType<typeof launchSpaceApproach>,
  t: number,
  w: number,
  h: number,
) {
  const { launch, earth } = geometry(w, h);
  const first = space.points[0].state;
  const sampled = sampleSpacePoint(space.points, t)!;
  return similaritySpacePose({
    currentPosition: sampled.state.position,
    currentVelocity: sampled.state.velocity,
    initialPosition: first.position,
    earthCenter: { x: earth.x, y: earth.y },
    launchPoint: launch,
  });
}

function screenPose(angleNorm: number, t: number, w: number, h: number) {
  const { earthBearing, startAltitudeM, launch } = geometry(w, h);
  const speed = mapLaunchToInput(0.5, angleNorm, 1).initialSpeedMps;
  const space = launchSpaceApproach(speed, angleNorm, earthBearing, startAltitudeM);
  const p = poseAt(space, t, w, h);
  return {
    space,
    x: p.x,
    y: p.y,
    angle: p.angle,
    idleAngle: directionNormToScreenHeadingRad(angleNorm),
    launch,
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
  const { centerDistancePx, startAltitudeM, earthBearing, launch } = geometry(
    size.w,
    size.h,
  );
  const physicalRatio =
    SPACE_EARTH_RADIUS_M / (SPACE_EARTH_RADIUS_M + startAltitudeM);
  const visualRatio = earth.r / centerDistancePx;
  if (Math.abs(physicalRatio - visualRatio) > 0.006) {
    throw new Error(
      `${size.name} earth ratio physical=${physicalRatio} visual=${visualRatio}`,
    );
  }
  console.log(
    `${size.name} startAlt=${startAltitudeM.toFixed(0)} ratioErr=${Math.abs(
      physicalRatio - visualRatio,
    ).toFixed(6)}`,
  );

  const offsets = [0, 4 / 360, -4 / 360];
  const labels = ["direct", "+4", "-4"];
  for (let i = 0; i < offsets.length; i++) {
    const n = wrap01(screenHeadingToNorm(earthBearing) + offsets[i]);
    const a = screenPose(n, 0, size.w, size.h);
    const posErr = Math.hypot(a.x - launch.x, a.y - launch.y);
    if (posErr > 0.5) throw new Error(`${size.name} ${labels[i]} position ${posErr}`);
    const headErr = headingDeltaDeg(a.idleAngle, a.angle);
    if (headErr > 0.05) {
      throw new Error(`${size.name} ${labels[i]} heading ${headErr}`);
    }
    console.log(
      `${size.name} ${labels[i]} headingErr=${headErr.toFixed(4)}deg`,
    );
  }
}

let reportEntryN = 0.5;
let reportMissN = 0;
let reportGrazeN = 0;
let reportGrazeAlt = 0;
let reportSep = 0;
let reportGamma = 0;

for (const size of sizes) {
  const { earthBearing, startAltitudeM, earth, launch } = geometry(size.w, size.h);
  const earthNorm = screenHeadingToNorm(earthBearing);
  const entries: {
    n: number;
    space: Extract<ReturnType<typeof launchSpaceApproach>, { kind: "ATMOSPHERE_ENTRY" }>;
  }[] = [];
  let clearMiss: ReturnType<typeof launchSpaceApproach> | null = null;
  let graze: ReturnType<typeof launchSpaceApproach> | null = null;
  let grazeAlt = Infinity;

  for (let deg = -28; deg <= 28; deg += 0.5) {
    const n = wrap01(earthNorm + deg / 360);
    const speed = mapLaunchToInput(0.55, n, 1).initialSpeedMps;
    const space = launchSpaceApproach(speed, n, earthBearing, startAltitudeM);
    if (space.kind === "ATMOSPHERE_ENTRY") {
      entries.push({ n, space });
    } else {
      const minAlt = Math.min(...space.points.map((p) => p.altitudeM));
      if (
        minAlt <= ATMOSPHERE_HANDOFF_ALTITUDE_M + 350_000 &&
        minAlt < grazeAlt
      ) {
        graze = space;
        grazeAlt = minAlt;
        reportGrazeN = n;
      }
      if (!clearMiss && minAlt > ATMOSPHERE_HANDOFF_ALTITUDE_M + 800_000) {
        clearMiss = space;
        reportMissN = n;
      }
    }
  }

  if (entries.length < 2) {
    throw new Error(`${size.name} need two ATMOSPHERE_ENTRY got ${entries.length}`);
  }
  if (!clearMiss) throw new Error(`${size.name} no clear SPACE_MISS`);
  if (!graze) throw new Error(`${size.name} no grazing SPACE_MISS`);

  let pair:
    | [
        (typeof entries)[0],
        (typeof entries)[0],
      ]
    | null = null;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const d = headingDeltaDeg(
        directionNormToScreenHeadingRad(entries[i].n),
        directionNormToScreenHeadingRad(entries[j].n),
      );
      const g = Math.abs(
        ((entries[i].space.entry.gammaRad - entries[j].space.entry.gammaRad) *
          180) /
          Math.PI,
      );
      if (d >= 1 && g >= 0.15) {
        pair = [entries[i], entries[j]];
        break;
      }
    }
    if (pair) break;
  }
  if (!pair) throw new Error(`${size.name} no distinct entry pair`);

  const contacts = pair.map((item) => {
    const first = item.space.points[0].state;
    const terminal = item.space.points[item.space.points.length - 1].state;
    return similaritySpacePose({
      currentPosition: terminal.position,
      currentVelocity: terminal.velocity,
      initialPosition: first.position,
      earthCenter: { x: earth.x, y: earth.y },
      launchPoint: launch,
    });
  });
  const sep = Math.hypot(
    contacts[0].x - contacts[1].x,
    contacts[0].y - contacts[1].y,
  );
  if (sep < Math.max(4, earth.r * 0.05)) {
    throw new Error(`${size.name} contact sep ${sep}`);
  }
  const gammaDiff = Math.abs(
    ((pair[0].space.entry.gammaRad - pair[1].space.entry.gammaRad) * 180) /
      Math.PI,
  );
  reportEntryN = pair[0].n;
  reportSep = sep;
  reportGamma = gammaDiff;
  reportGrazeAlt = grazeAlt;
  console.log(
    `${size.name} entryN=${pair[0].n.toFixed(4)} missN=${reportMissN.toFixed(4)} grazeAlt=${grazeAlt.toFixed(0)} sep=${sep.toFixed(2)}px gammaDiff=${gammaDiff.toFixed(3)}deg`,
  );
}

const launchedMiss = runStage1Launch(
  0.4,
  reportMissN,
  7,
  geometry(1440, 900).earthBearing,
  geometry(1440, 900).startAltitudeM,
);
if (launchedMiss.space.kind !== "SPACE_MISS") {
  throw new Error("expected SPACE_MISS launch");
}
if (launchedMiss.result.outcome !== "SKIP") {
  throw new Error("SPACE_MISS must be SKIP");
}

const missGeom = geometry(1280, 720);
let miss = launchSpaceApproach(
  mapLaunchToInput(0.5, reportMissN, 1).initialSpeedMps,
  reportMissN,
  missGeom.earthBearing,
  missGeom.startAltitudeM,
);
if (miss.kind !== "SPACE_MISS") {
  miss = launchSpaceApproach(
    mapLaunchToInput(0.5, 0, 1).initialSpeedMps,
    0,
    missGeom.earthBearing,
    missGeom.startAltitudeM,
  );
}
if (miss.kind !== "SPACE_MISS") throw new Error("no SPACE_MISS sample");
console.log("SPACE miss samples", miss.points.length, "startAlt", miss.startAltitudeM);

const jump = maxHeadingJumpDeg(miss.points);
if (jump > 15) throw new Error(`heading jump ${jump}`);
const later = miss.points[Math.min(miss.points.length - 1, Math.floor(miss.points.length * 0.8))].state;
const earlier = miss.points[Math.floor(miss.points.length * 0.2)].state;
const h0 = Math.atan2(earlier.velocity.y, earlier.velocity.x);
const h1 = Math.atan2(later.velocity.y, later.velocity.x);
if (headingDeltaDeg(h0, h1) < 0.5) {
  throw new Error("flyby heading did not change");
}
console.log("gravity jumpDeg", jump.toFixed(3));

const startFar = failureDestructionStartS(200_000, "BURN");
const startClose = failureDestructionStartS(4_000, "BURN");
if (startFar < 3) throw new Error(`far failure start ${startFar}`);
if (startClose > 10) throw new Error(`near failure start ${startClose}`);
if (destructionAmountFromEntryS(2.9, "BURN", 200_000) !== 0) {
  throw new Error("early burn");
}
if (destructionAmountFromEntryS(3.0, "BURN", 200_000) !== 0) {
  throw new Error("burn at 3s should start 0");
}
if (destructionAmountFromEntryS(4.4, "BURN", 200_000) <= 0) {
  throw new Error("late burn");
}
console.log("failure survival", startFar.toFixed(3), startClose.toFixed(3));
console.log("start altitude default", SPACE_START_ALTITUDE_M, "handoff", ATMOSPHERE_HANDOFF_ALTITUDE_M);

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
const missEarthCam = cinematicEarthView({
  w: missW,
  h: missH,
  idle: false,
  miss: true,
  travelT: 1,
  spaceT: 1,
});
const startEarth = launchEarthView(missW, missH);
if (missEarthCam.r >= startEarth.r * 1.08) {
  throw new Error(`earth did not shrink outbound ${missEarthCam.r}`);
}

const periIdx = closestApproachIndex(miss.points);
const firstPt = miss.points[0].state;
const periPt = miss.points[periIdx].state;
const missLaunch = launchAnchorPx(missW, missH);

const missPositions: { t: number; x: number; y: number }[] = [];
for (let ms = 0; ms <= SPACE_MISS_DURATION_MS; ms += 500) {
  const spaceT = ms / SPACE_MISS_DURATION_MS;
  const pathT = missPlaybackToPathT(spaceT, periIdx, miss.points.length);
  const sampled = sampleSpacePoint(miss.points, pathT);
  if (!sampled) throw new Error("missing miss sample");
  const pos = similaritySpacePose({
    currentPosition: sampled.state.position,
    currentVelocity: sampled.state.velocity,
    initialPosition: firstPt.position,
    earthCenter: { x: startEarth.x, y: startEarth.y },
    launchPoint: missLaunch,
  });
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
const periScreened = similaritySpacePose({
  currentPosition: periPt.position,
  currentVelocity: periPt.velocity,
  initialPosition: firstPt.position,
  earthCenter: { x: startEarth.x, y: startEarth.y },
  launchPoint: missLaunch,
});
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

void reportEntryN;
void reportGrazeN;
console.log(
  "v16 miss durationMs",
  SPACE_MISS_DURATION_MS,
  "outboundPx",
  outboundTravel.toFixed(1),
  "headingJump",
  headingJump.toFixed(3),
);
console.log("v16 checks ok");
console.log(
  "v19 report entry",
  reportEntryN,
  "miss",
  reportMissN,
  "grazeAlt",
  reportGrazeAlt,
  "sep",
  reportSep,
  "gamma",
  reportGamma,
);
console.log("v19 checks ok");
