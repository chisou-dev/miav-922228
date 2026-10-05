import { performance } from "node:perf_hooks";
import { simulateReentry } from "../features/home/reentry/reentryPhysics";
import type { ReentryOutcome } from "../features/home/reentry/reentryTypes";

const ANGLE_MIN = 0.5;
const ANGLE_MAX = 16;
const ANGLE_STEP = 0.5;
const SPEED_MIN = 7000;
const SPEED_MAX = 9000;
const SPEED_STEP = 100;
const SEEDS = [1, 42, 0xdeadbeef, 0xcafebabe, 7];

const OUTCOME_CHAR: Record<ReentryOutcome, string> = {
  SKIP: "S",
  BURN: "H",
  BREAK: "X",
  EARTH_REACHED: "E",
};

function gridPlayCount(): number {
  const angles =
    Math.floor((ANGLE_MAX - ANGLE_MIN) / ANGLE_STEP) + 1;
  const speeds =
    Math.floor((SPEED_MAX - SPEED_MIN) / SPEED_STEP) + 1;
  return angles * speeds * SEEDS.length;
}

function dominantOutcome(counts: Record<ReentryOutcome, number>): ReentryOutcome {
  const order: ReentryOutcome[] = [
    "EARTH_REACHED",
    "BREAK",
    "BURN",
    "SKIP",
  ];
  let best: ReentryOutcome = "SKIP";
  let bestN = -1;
  for (const o of order) {
    if (counts[o] > bestN) {
      bestN = counts[o];
      best = o;
    }
  }
  return best;
}

function main() {
  const totals: Record<ReentryOutcome, number> = {
    SKIP: 0,
    BURN: 0,
    BREAK: 0,
    EARTH_REACHED: 0,
  };

  const times: number[] = [];
  let maxFrames = 0;
  let frameSum = 0;
  let plays = 0;

  const angleRows: number[] = [];
  for (let a = ANGLE_MIN; a <= ANGLE_MAX; a += ANGLE_STEP) {
    angleRows.push(Number(a.toFixed(1)));
  }
  const speedCols: number[] = [];
  for (let s = SPEED_MIN; s <= SPEED_MAX; s += SPEED_STEP) {
    speedCols.push(s);
  }

  const mapSeed = SEEDS[0];
  const map: string[][] = angleRows.map(() =>
    speedCols.map(() => "?"),
  );

  for (const angle of angleRows) {
    for (const speed of speedCols) {
      const seedCounts: Record<ReentryOutcome, number> = {
        SKIP: 0,
        BURN: 0,
        BREAK: 0,
        EARTH_REACHED: 0,
      };
      for (const seed of SEEDS) {
        const t0 = performance.now();
        const r = simulateReentry({
          seed,
          entryAngleDeg: angle,
          headingDeg: 0,
          initialSpeedMps: speed,
        });
        times.push(performance.now() - t0);
        totals[r.outcome]++;
        seedCounts[r.outcome]++;
        plays++;
        frameSum += r.frames.length;
        maxFrames = Math.max(maxFrames, r.frames.length);
        if (seed === mapSeed) {
          const row = angleRows.indexOf(angle);
          const col = speedCols.indexOf(speed);
          map[row][col] = OUTCOME_CHAR[r.outcome];
        }
      }
      if (SEEDS.length > 1) {
        const dom = dominantOutcome(seedCounts);
        const row = angleRows.indexOf(angle);
        const col = speedCols.indexOf(speed);
        map[row][col] = OUTCOME_CHAR[dom];
      }
    }
  }

  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)] ?? 0;
  const p95 = times[Math.floor(times.length * 0.95)] ?? 0;
  const maxT = times[times.length - 1] ?? 0;

  console.log("plays", plays, "expected", gridPlayCount());
  console.log(
    "SKIP %",
    ((totals.SKIP / plays) * 100).toFixed(2),
    "BURN %",
    ((totals.BURN / plays) * 100).toFixed(2),
    "BREAK %",
    ((totals.BREAK / plays) * 100).toFixed(2),
    "EARTH %",
    ((totals.EARTH_REACHED / plays) * 100).toFixed(2),
  );
  console.log(
    "frames avg",
    (frameSum / plays).toFixed(1),
    "max",
    maxFrames,
  );
  console.log(
    "sim ms median",
    median.toFixed(2),
    "p95",
    p95.toFixed(2),
    "max",
    maxT.toFixed(2),
  );

  console.log("\nOutcome map (seed", mapSeed, ", S/H/X/E):");
  console.log("speed→", speedCols.filter((_, i) => i % 4 === 0).join(" "));
  for (let r = 0; r < map.length; r++) {
    if (r % 2 !== 0) continue;
    const line = map[r]
      .map((c, i) => (i % 4 === 0 ? c : ""))
      .join("");
    console.log(
      angleRows[r].toFixed(1).padStart(4, " "),
      line,
    );
  }

  const det = simulateReentry({
    seed: 42,
    entryAngleDeg: 4,
    headingDeg: 0,
    initialSpeedMps: 7600,
  });
  const det2 = simulateReentry({
    seed: 42,
    entryAngleDeg: 4,
    headingDeg: 0,
    initialSpeedMps: 7600,
  });
  console.log(
    "\ndeterminism",
    det.outcome === det2.outcome &&
      det.frames.length === det2.frames.length &&
      JSON.stringify(det.frames) === JSON.stringify(det2.frames) &&
      JSON.stringify(det.metrics) === JSON.stringify(det2.metrics),
  );
}

main();
