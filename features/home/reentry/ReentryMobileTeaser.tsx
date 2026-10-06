"use client";

import { useEffect } from "react";
import { ReentryAssetImage } from "./ReentryAssetImage";
import { REENTRY_ART } from "./reentryArtPresentation";
import { vehicleTeaserRotationDeg } from "./reentryVehiclePresentation";
import { preloadReentryVehicleAsset } from "./reentryAssets";

export function ReentryMobileTeaser({
  onOpen,
}: {
  onOpen: () => void;
}) {
  useEffect(() => {
    void preloadReentryVehicleAsset();
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex ${REENTRY_ART.mobileTeaser.buttonClass} shrink-0 items-center justify-center rounded-full border border-[var(--line)]/55 bg-[#070b10]/80 shadow-sm transition-colors hover:border-[var(--foreground-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-muted)]`}
      aria-label="Open atmospheric reentry experience"
    >
      <span className="reentry-teaser-float absolute inset-0 flex items-center justify-center" aria-hidden>
        <ReentryAssetImage
          asset="vehicle"
          alt=""
          className={`${REENTRY_ART.mobileTeaser.vehicleClass} object-contain opacity-90 transition-opacity group-hover:opacity-100 [mask-image:radial-gradient(ellipse_46%_72%_at_50%_46%,#000_60%,transparent_82%)]`}
          style={{ transform: `rotate(${vehicleTeaserRotationDeg()}deg)` }}
          loading="eager"
        />
      </span>
    </button>
  );
}
