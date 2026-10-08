import { launchContinuityErrorPx } from "./reentryCraftProjection";
import { mapLaunchToInput } from "./reentryLaunchInput";
import {
  evaluateNearbyJob,
  nearbyJobs,
  nearbySuccessStats,
  shouldShowNearbySuccess,
} from "./reentryNearbySuccess";
import { simulateReentry } from "./reentryPhysics";

const sizes = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "mobile", w: 390, h: 844 },
];

const powerNorm = 0.46;
const angleNorm = 0.5;
const result = simulateReentry(mapLaunchToInput(powerNorm, angleNorm, 7));

for (const size of sizes) {
  const error = launchContinuityErrorPx(angleNorm, result, size.w, size.h);
  if (error > 1) {
    throw new Error(`${size.name} launch delta ${error}px`);
  }
  console.log(`launch continuity ${size.name}: ${error.toFixed(4)} px`);
}

if (shouldShowNearbySuccess("EARTH_REACHED")) {
  throw new Error("EARTH_REACHED must hide nearby success");
}
for (const outcome of ["BURN", "BREAK", "SKIP"] as const) {
  if (!shouldShowNearbySuccess(outcome)) {
    throw new Error(`${outcome} must show nearby success`);
  }
}

const jobs = nearbyJobs(powerNorm, angleNorm);
if (jobs.length > 75) {
  throw new Error(`job cap exceeded: ${jobs.length}`);
}

const sampleJob = jobs[0];
const first = evaluateNearbyJob(sampleJob);
const second = evaluateNearbyJob(sampleJob);
if (first !== second) {
  throw new Error("nearby job is not deterministic");
}

const stats = nearbySuccessStats(first ? 1 : 0, 1);
console.log(`jobs=${jobs.length} sampleReached=${stats.reached} repeat=${second}`);
console.log("v8 checks ok");
