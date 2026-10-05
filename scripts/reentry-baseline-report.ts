import { writeFileSync } from "node:fs";
import { simulateReentry } from "../features/home/reentry/reentryPhysics";
import type { ReentryInput } from "../features/home/reentry/reentryTypes";

const CASES: { angle: number; speed: number; label: string }[] = [
  { label: "A", angle: 1, speed: 8500 },
  { label: "B", angle: 1, speed: 7200 },
  { label: "C", angle: 4, speed: 7600 },
  { label: "D", angle: 6, speed: 8000 },
  { label: "E", angle: 10, speed: 8200 },
  { label: "F", angle: 15, speed: 9000 },
];

const SEEDS = [0xdeadbeef, 0x12345678, 42, 7, 0xcafebabe];

export function runBaselineReport(tag: string) {
  const rows: Record<string, unknown>[] = [];
  for (const c of CASES) {
    for (const seed of SEEDS) {
      const input: ReentryInput = {
        seed,
        entryAngleDeg: c.angle,
        headingDeg: 0,
        initialSpeedMps: c.speed,
      };
      const r = simulateReentry(input);
      rows.push({
        tag,
        case: c.label,
        angle: c.angle,
        speed: c.speed,
        seed,
        outcome: r.outcome,
        maxHeatFluxWm2: r.metrics.maxHeatFluxWm2,
        totalHeatLoadJm2: r.metrics.totalHeatLoadJm2,
        maxDynamicPressurePa: r.metrics.maxDynamicPressurePa,
        minimumAltitudeM: r.metrics.minimumAltitudeM,
        finalSpeedMps: r.metrics.finalSpeedMps,
        remainingIntegrity: r.metrics.remainingIntegrity,
        remainingStructuralIntegrity:
          r.metrics.remainingStructuralIntegrity,
        remainingThermalIntegrity: r.metrics.remainingThermalIntegrity,
        frames: r.frames.length,
      });
    }
  }
  return rows;
}

const tag = process.argv[2] ?? "v1";
const rows = runBaselineReport(tag);
const path = `scripts/reentry-baseline-${tag}.json`;
writeFileSync(path, JSON.stringify(rows, null, 2));
console.log(`wrote ${path} (${rows.length} rows)`);
