import { REENTRY_ART } from "./reentryArtPresentation";
import {
  craftBaseNoseRotationDeg,
  craftNoseRotationDeg,
} from "./reentrySceneLayout";
import type { ReentryArtVariant } from "./reentryArtPresentation";

/** Stage / preview craft rotation (nose toward Earth). */
export function vehicleStageRotationDeg(
  variant: ReentryArtVariant,
  angleNorm: number,
  flightWobbleDeg = 0,
): number {
  const extra =
    variant === "preview"
      ? REENTRY_ART.vehicle.preview.rotationOffsetDeg
      : REENTRY_ART.vehicle.stage.rotationOffsetDeg;
  return craftNoseRotationDeg(angleNorm, flightWobbleDeg) + extra;
}

/** Mobile teaser icon — same asset, optional fine-tune. */
export function vehicleTeaserRotationDeg(): number {
  return (
    craftBaseNoseRotationDeg() + REENTRY_ART.vehicle.teaser.rotationOffsetDeg
  );
}
