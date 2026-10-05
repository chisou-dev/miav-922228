import { simulateReentry } from "../features/home/reentry/reentryPhysics";
import type { ReentryInput } from "../features/home/reentry/reentryTypes";

function runCase(label: string, input: ReentryInput) {
  const t0 = performance.now();
  const a = simulateReentry(input);
  const t1 = performance.now();
  const b = simulateReentry(input);
  const match =
    a.outcome === b.outcome &&
    JSON.stringify(a.frames) === JSON.stringify(b.frames) &&
    JSON.stringify(a.metrics) === JSON.stringify(b.metrics);

  for (const f of a.frames) {
    if (!Number.isFinite(f.x) || !Number.isFinite(f.y) || !Number.isFinite(f.speedMps)) {
      throw new Error(`${label}: non-finite frame`);
    }
  }

  console.log(
    JSON.stringify({
      label,
      outcome: a.outcome,
      frames: a.frames.length,
      minAlt: a.metrics.minimumAltitudeM,
      maxQ: a.metrics.maxDynamicPressurePa,
      maxHeat: a.metrics.maxHeatFluxWm2,
      ms: (t1 - t0).toFixed(2),
      determinism: match,
    }),
  );
}

const seed = 0xdeadbeef;

runCase("shallow-1deg-slow", {
  seed,
  entryAngleDeg: 1,
  headingDeg: 45,
  initialSpeedMps: 7200,
});

runCase("steep-fast", {
  seed,
  entryAngleDeg: 15,
  headingDeg: 45,
  initialSpeedMps: 9000,
});

runCase("mid-7deg-8kms", {
  seed,
  entryAngleDeg: 7,
  headingDeg: 45,
  initialSpeedMps: 8000,
});

runCase("mid-5deg-7500", {
  seed: 0x12345678,
  entryAngleDeg: 5,
  headingDeg: 90,
  initialSpeedMps: 7500,
});

console.log("--- sweep ---");
const seedSweep = 1;
for (const [angle, speed] of [
  [0.5, 8800],
  [0.5, 9000],
  [1, 9000],
  [6, 7500],
  [8, 7800],
  [10, 7200],
  [14, 9000],
  [16, 9000],
] as const) {
  const r = simulateReentry({
    seed: seedSweep,
    entryAngleDeg: angle,
    headingDeg: 0,
    initialSpeedMps: speed,
  });
  console.log(
    `angle=${angle} speed=${speed} -> ${r.outcome} frames=${r.frames.length} minAlt=${Math.round(r.metrics.minimumAltitudeM)}`,
  );
}
