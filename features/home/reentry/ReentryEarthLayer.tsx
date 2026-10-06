"use client";

import { ReentryAssetImage } from "./ReentryAssetImage";
import { REENTRY_ART } from "./reentryArtPresentation";

/** Full-stage space background; Earth is baked into the WebP on #020304 black. */
export function ReentryEarthLayer({
  transform,
  filter,
  loading,
}: {
  transform: string;
  filter: string;
  loading: "lazy" | "eager";
}) {
  const bleed = REENTRY_ART.background.bleedPercent;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[#020304]" />
      <div
        className="absolute overflow-hidden"
        style={{
          inset: `-${bleed}%`,
        }}
      >
        <div
          className="absolute inset-0 transition-transform duration-300 will-change-transform"
          style={{ transform, filter }}
        >
          <ReentryAssetImage
            asset="spaceEarth"
            alt=""
            className="h-full w-full min-h-full min-w-full"
            style={{
              objectFit: REENTRY_ART.background.objectFit,
              objectPosition: REENTRY_ART.background.objectPosition,
            }}
            loading={loading}
          />
        </div>
      </div>
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 115% 95% at 48% 52%, transparent 48%, rgba(2,3,4,0.55) 78%, #020304 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "linear-gradient(145deg, rgba(2,3,4,0.65) 0%, transparent 42%, transparent 68%, rgba(2,3,4,0.35) 100%)",
        }}
      />
    </div>
  );
}
