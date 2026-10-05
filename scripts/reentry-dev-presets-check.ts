import { simulateReentry } from "../features/home/reentry/reentryPhysics";
import {
  listDevPresetKeys,
  resolveDevPreset,
} from "../features/home/reentry/reentryDevPresets";

for (const key of listDevPresetKeys()) {
  const preset = resolveDevPreset(key);
  if (!preset) throw new Error(`missing ${key}`);
  const r = simulateReentry(preset.input);
  const ok = r.outcome === preset.expectOutcome;
  console.log(
    JSON.stringify({
      key,
      ok,
      outcome: r.outcome,
      expect: preset.expectOutcome,
      frames: r.frames.length,
    }),
  );
  if (!ok) process.exitCode = 1;
}
