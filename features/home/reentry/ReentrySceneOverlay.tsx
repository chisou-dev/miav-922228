"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { AimingPull } from "./reentryAimInput";
import type { ReentryPhase } from "./reentryTypes";
import {
  REENTRY_SCENE,
  anchorToPercent,
  craftEarthTravelT,
  craftPositionPercent,
} from "./reentrySceneLayout";
import type { ReentryArtVariant } from "./reentryArtPresentation";

type StageLayout = { w: number; h: number; left: number; top: number };

export function ReentrySceneOverlay({
  phase,
  aimingPull,
  flightProgress,
  interior,
  variant,
  showGuides,
  showIntroPulse,
}: {
  phase: ReentryPhase;
  aimingPull: AimingPull | null;
  flightProgress: number;
  interior: number;
  variant: ReentryArtVariant;
  showGuides: boolean;
  showIntroPulse?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<StageLayout>({
    w: 1,
    h: 1,
    left: 0,
    top: 0,
  });

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setLayout({ w: r.width, h: r.height, left: r.left, top: r.top });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!showGuides) return null;

  const showTrajectory = phase === "flight" || phase === "result";
  const travelT = craftEarthTravelT(flightProgress, 1 - interior);
  const craftPos = craftPositionPercent(travelT, variant);
  const earth = REENTRY_SCENE.earth;
  const craft = REENTRY_SCENE.craft;

  const aimLine =
    phase === "aiming" && aimingPull && layout.w > 1
      ? (() => {
          const rect = {
            left: layout.left,
            top: layout.top,
            width: layout.w,
            height: layout.h,
          } as DOMRect;
          const end = anchorToPercent(
            rect,
            aimingPull.currentX,
            aimingPull.currentY,
          );
          return {
            x1: craft.x,
            y1: craft.y,
            x2: end.x,
            y2: end.y,
          };
        })()
      : null;

  const rimX = earth.x;
  const rimY = earth.y - 5;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[2]">
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

        {showIntroPulse && phase === "ready" && (
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
        {aimLine && (
          <>
            <line
              x1={aimLine.x1}
              y1={aimLine.y1}
              x2={aimLine.x2}
              y2={aimLine.y2}
              stroke="rgba(210,220,230,0.42)"
              strokeWidth="0.28"
            />
            <circle
              cx={aimLine.x2}
              cy={aimLine.y2}
              r="0.55"
              fill="rgba(220,228,235,0.5)"
            />
          </>
        )}
      </svg>
    </div>
  );
}
