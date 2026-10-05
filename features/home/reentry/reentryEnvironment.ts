import { lerpFromUnit, mixU32, u32ToUnit } from "./seededRandom";

export interface ReentryEnvironment {
  densityScale: number;
  windAlongTrackMps: number;
  thermalToleranceScale: number;
  structuralToleranceScale: number;
}

export function environmentFromSeed(seed: number): ReentryEnvironment {
  const h0 = mixU32(seed, 0x1111, 0x2222, 0x3333);
  const h1 = mixU32(seed, 0x4444, 0x5555, 0x6666);
  const h2 = mixU32(seed, 0x7777, 0x8888, 0x9999);
  const h3 = mixU32(seed, 0xaaaa, 0xbbbb, 0xcccc);

  return {
    densityScale: lerpFromUnit(u32ToUnit(h0), 0.96, 1.04),
    windAlongTrackMps: lerpFromUnit(u32ToUnit(h1), -20, 20),
    thermalToleranceScale: lerpFromUnit(u32ToUnit(h2), 0.98, 1.02),
    structuralToleranceScale: lerpFromUnit(u32ToUnit(h3), 0.98, 1.02),
  };
}
