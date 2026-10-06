"use client";

import type { ReentryPhase } from "./reentryTypes";
import {
  REENTRY_SCENE,
  craftEarthTravelT,
  craftNoseRotationDeg,
  craftPositionPercent,
} from "./reentrySceneLayout";
import type { ReentryArtVariant } from "./reentryArtPresentation";

function noseGuideEnd(angleNorm: number, length = 20): { x: number; y: number } {
  const craft = REENTRY_SCENE.craft;
  const rad = (craftNoseRotationDeg(angleNorm, 0) * Math.PI) / 180;
  const dx = Math.sin(rad) * length;
  const dy = -Math.cos(rad) * length;
  return { x: craft.x + dx, y: craft.y + dy };
}

export function ReentrySceneOverlay({
  phase,
  angleNorm,
  flightProgress,
  interior,
  variant,
  showGuides,
  showIntroPulse,
}: {
  phase: ReentryPhase;
  angleNorm: number;
  flightProgress: number;
  interior: number;
  variant: ReentryArtVariant;
  showGuides: boolean;
  showIntroPulse?: boolean;
}) {
  if (!showGuides) return null;

  const showTrajectory = phase === "flight" || phase === "result";
  const travelT = craftEarthTravelT(flightProgress, 1 - interior);
  const craftPos = craftPositionPercent(travelT, variant);
  const earth = REENTRY_SCENE.earth;
  const craft = REENTRY_SCENE.craft;
  const guideEnd = noseGuideEnd(angleNorm);
  const showAngleGuide = phase === "angle";

  const rimX = earth.x;
  const rimY = earth.y - 5;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      <svg
        className="h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <ellipse
          cx={rimX}
          cy={rimY}
          rx="9"
          ry="5.5"
          fill="none"
          stroke="rgba(130,185,220,0.22)"
          strokeWidth="0.35"
        />
        <ellipse
          cx={rimX}
          cy={rimY}
          rx="7"
          ry="4"
          fill="none"
          stroke="rgba(180,215,240,0.12)"
          strokeWidth="0.2"
        />

        {showIntroPulse && phase === "power" && (
          <line
            x1={craft.x}
            y1={craft.y}
            x2={rimX}
            y2={rimY}
            className="reentry-intro-guide"
            stroke="rgba(190,205,220,0.28)"
            strokeWidth="0.3"
            strokeDasharray="1.5 2"
          />
        )}

        {showAngleGuide && (
          <line
            x1={craft.x}
            y1={craft.y}
            x2={guideEnd.x}
            y2={guideEnd.y}
            stroke="rgba(200,215,230,0.38)"
            strokeWidth="0.28"
            strokeDasharray="1.2 1.8"
          />
        )}

        {showTrajectory && (
          <>
            <line
              x1={craft.x}
              y1={craft.y}
              x2={earth.x}
              y2={earth.y}
              stroke="rgba(180,190,200,0.12)"
              strokeWidth="0.22"
              strokeDasharray="1.2 1.6"
            />
            <circle
              cx={craftPos.x}
              cy={craftPos.y}
              r="0.55"
              fill="rgba(210,218,228,0.35)"
            />
          </>
        )}
      </svg>
    </div>
  );
}
