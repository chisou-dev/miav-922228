"use client";

import { useEffect, useRef } from "react";
import { REENTRY_ASSET_FALLBACK, REENTRY_ASSET_PATHS } from "./reentryAssets";
import {
  playbackToFrameProgress,
  presentationHeatGlow,
} from "./reentryPlayback";
import { craftNoseRotationDeg } from "./reentrySceneLayout";
import type { ReentryArtVariant } from "./reentryArtPresentation";
import type { ReentryOutcome, ReentryPhase, ReentryResult } from "./reentryTypes";
import { restFrame, sampleFrame } from "./reentryVisual";

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** How far the craft has traveled toward Earth (presentation only). */
function visualTravel(playback: number, outcome?: ReentryOutcome): number {
  const eased = smoothstep(playback);
  if (!outcome) return 0;
  if (outcome === "SKIP" && playback > 0.56) {
    const retreat = smoothstep((playback - 0.56) / 0.38);
    return eased * (1 - retreat * 0.78);
  }
  if (outcome === "BURN" || outcome === "BREAK") {
    return Math.min(eased, 0.7);
  }
  return eased;
}

function earthWidthFraction(
  playback: number,
  outcome: ReentryOutcome | undefined,
  idle: boolean,
): number {
  if (idle) return 0.21;
  const approach = smoothstep(playback / 0.8);
  let frac = 0.21 + approach * (outcome === "EARTH_REACHED" ? 0.26 : 0.16);
  if (outcome === "SKIP" && playback > 0.56) {
    const retreat = smoothstep((playback - 0.56) / 0.38);
    frac += (0.21 - frac) * retreat;
  }
  return frac;
}

function loadImage(primary: string, fallback: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fb = new Image();
      fb.onload = () => resolve(fb);
      fb.onerror = () => resolve(img);
      fb.src = fallback;
    };
    img.src = primary;
  });
}

/** Fade rectangular leftovers so the hull reads as a craft, not a pasted card. */
function maskVehicle(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, img.naturalWidth || img.width);
  c.height = Math.max(1, img.naturalHeight || img.height);
  const g = c.getContext("2d");
  if (!g) return c;
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-in";
  const cx = c.width * 0.5;
  const cy = c.height * 0.46;
  const grd = g.createRadialGradient(cx, cy, c.height * 0.08, cx, cy, c.height * 0.5);
  grd.addColorStop(0, "rgba(0,0,0,1)");
  grd.addColorStop(0.62, "rgba(0,0,0,1)");
  grd.addColorStop(0.86, "rgba(0,0,0,0.55)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function heatStyle(glow: number): { core: string; mid: string; edge: string } {
  if (glow < 0.22) {
    return {
      core: "rgba(230,244,255,0.9)",
      mid: "rgba(160,200,255,0.45)",
      edge: "rgba(80,140,220,0)",
    };
  }
  if (glow < 0.48) {
    return {
      core: "rgba(255,250,235,0.95)",
      mid: "rgba(255,210,120,0.55)",
      edge: "rgba(255,160,60,0)",
    };
  }
  if (glow < 0.74) {
    return {
      core: "rgba(255,255,245,1)",
      mid: "rgba(255,150,50,0.7)",
      edge: "rgba(255,70,20,0)",
    };
  }
  return {
    core: "rgba(255,255,255,1)",
    mid: "rgba(255,90,30,0.85)",
    edge: "rgba(180,20,0,0)",
  };
}

export function ReentryPresentationCanvas({
  phase,
  result,
  flightProgress,
  angleNorm,
  variant,
}: {
  phase: ReentryPhase;
  result: ReentryResult | null;
  flightProgress: number;
  angleNorm: number;
  variant: ReentryArtVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earthRef = useRef<HTMLImageElement | null>(null);
  const vehicleRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let live = true;
    void loadImage(
      REENTRY_ASSET_PATHS.spaceEarth,
      REENTRY_ASSET_FALLBACK.spaceEarth,
    ).then((img) => {
      if (live) earthRef.current = img;
    });
    void loadImage(
      REENTRY_ASSET_PATHS.vehicle,
      REENTRY_ASSET_FALLBACK.vehicle,
    ).then((img) => {
      if (live && img.naturalWidth > 0) vehicleRef.current = maskVehicle(img);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.max(1, parent.clientWidth);
      const h = Math.max(1, parent.clientHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#020304";
      ctx.fillRect(0, 0, w, h);

      const idle = phase === "power" || phase === "angle";
      const playback = phase === "result" ? 1 : phase === "flight" ? flightProgress : 0;
      const outcome = result?.outcome;
      const frame =
        result && (phase === "flight" || phase === "result")
          ? sampleFrame(
              result.frames,
              playbackToFrameProgress(playback, outcome ?? "BURN"),
            )
          : restFrame(result);
      const glow = idle
        ? 0
        : Math.min(
            1,
            presentationHeatGlow(frame.heatFluxWm2, playback, outcome ?? "BURN") * 1.25,
          );
      const travel = idle ? 0 : visualTravel(playback, outcome);
      const earthFrac = earthWidthFraction(playback, outcome, idle);
      const earthR = (w * earthFrac) / 2;
      const earthX = earthR + w * 0.045;
      const earthY = h - earthR - Math.min(w, h) * 0.045;

      for (let i = 0; i < 28; i++) {
        const sx = ((i * 97) % 100) / 100;
        const sy = ((i * 53) % 100) / 100;
        ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 5) * 0.06})`;
        ctx.fillRect(sx * w, sy * h, 1.2, 1.2);
      }

      const earth = earthRef.current;
      ctx.save();
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
      ctx.clip();
      if (earth && earth.naturalWidth > 0) {
        const sx = earth.naturalWidth * 0.05;
        const sy = earth.naturalHeight * 0.62;
        const sw = earth.naturalWidth * 0.28;
        const sh = Math.min(earth.naturalHeight * 0.34, earth.naturalHeight - sy);
        ctx.drawImage(earth, sx, sy, sw, sh, earthX - earthR, earthY - earthR, earthR * 2, earthR * 2);
      } else {
        ctx.fillStyle = "#0c2438";
        ctx.fillRect(earthX - earthR, earthY - earthR, earthR * 2, earthR * 2);
      }
      ctx.restore();

      const atm = ctx.createRadialGradient(
        earthX,
        earthY,
        earthR * 0.92,
        earthX,
        earthY,
        earthR * 1.18,
      );
      atm.addColorStop(0, "rgba(120,190,255,0)");
      atm.addColorStop(0.55, `rgba(150,210,255,${0.18 + glow * 0.25})`);
      atm.addColorStop(1, "rgba(120,190,255,0)");
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR * 1.18, 0, Math.PI * 2);
      ctx.fill();

      const startX = w * (variant === "preview" ? 0.74 : 0.8);
      const startY = h * (variant === "preview" ? 0.22 : 0.16);
      const aimX = earthX + earthR * 0.05;
      const aimY = earthY - earthR * 0.62;
      let craftX = startX + (aimX - startX) * travel;
      let craftY = startY + (aimY - startY) * travel;
      if (outcome === "BREAK" && playback > 0.62) {
        craftX += Math.sin(playback * 40) * 3;
        craftY += Math.cos(playback * 36) * 2;
      }

      const rotDeg = craftNoseRotationDeg(angleNorm, idle ? 0 : playback * 1.2);
      const rot = (rotDeg * Math.PI) / 180;
      const noseX = Math.sin(rot);
      const noseY = -Math.cos(rot);
      const craftH = Math.min(w, h) * (variant === "preview" ? 0.28 : 0.2);
      const craftW = craftH * 0.62;

      if (glow > 0.04) {
        const colors = heatStyle(glow);
        const len = craftH * (0.7 + glow * 2.4);
        const tx = craftX - noseX * len;
        const ty = craftY - noseY * len;
        const trail = ctx.createLinearGradient(craftX, craftY, tx, ty);
        trail.addColorStop(0, colors.core);
        trail.addColorStop(0.35, colors.mid);
        trail.addColorStop(1, colors.edge);
        ctx.strokeStyle = trail;
        ctx.lineWidth = craftW * (0.22 + glow * 0.85);
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.35 + glow * 0.6;
        ctx.beginPath();
        ctx.moveTo(craftX - noseX * craftH * 0.15, craftY - noseY * craftH * 0.15);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.globalAlpha = 1;
        const bloom = ctx.createRadialGradient(
          craftX,
          craftY,
          craftH * 0.05,
          craftX,
          craftY,
          craftH * (0.55 + glow),
        );
        bloom.addColorStop(0, colors.core);
        bloom.addColorStop(0.4, colors.mid);
        bloom.addColorStop(1, colors.edge);
        ctx.globalAlpha = 0.18 + glow * 0.55;
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(craftX, craftY, craftH * (0.55 + glow), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      let craftAlpha = 1;
      if (outcome === "BURN" && playback > 0.72) {
        craftAlpha = Math.max(0, 1 - (playback - 0.72) / 0.2);
      }
      if (outcome === "BREAK" && playback > 0.68) {
        craftAlpha = Math.max(0, 1 - (playback - 0.68) / 0.14);
      }

      const vehicle = vehicleRef.current;
      if (vehicle && craftAlpha > 0.02) {
        ctx.save();
        ctx.translate(craftX, craftY);
        ctx.rotate(rot);
        ctx.globalAlpha = craftAlpha;
        ctx.drawImage(vehicle, -craftW / 2, -craftH / 2, craftW, craftH);
        ctx.restore();
      }

      if (outcome === "BREAK" && playback > 0.66) {
        const seed = result?.seed ?? 1;
        const burst = smoothstep((playback - 0.66) / 0.28);
        for (let i = 0; i < 9; i++) {
          const ang = rot + ((i - 4) * 0.28);
          const dist = craftH * (0.2 + burst * (0.8 + (i % 3) * 0.35));
          const px = craftX + Math.sin(ang) * dist * (0.4 + ((seed >> i) & 3) * 0.15);
          const py = craftY - Math.cos(ang) * dist;
          ctx.fillStyle = `rgba(220,200,180,${0.85 * (1 - burst * 0.35)})`;
          ctx.beginPath();
          ctx.ellipse(px, py, 2 + (i % 3), 1.2, ang, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (phase === "angle") {
        ctx.save();
        ctx.translate(craftX, craftY);
        ctx.strokeStyle = "rgba(210,225,235,0.45)";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(noseX * craftH * 0.42, noseY * craftH * 0.42);
        ctx.lineTo(noseX * craftH * 0.95, noseY * craftH * 0.95);
        ctx.stroke();
        ctx.restore();
      }
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [angleNorm, flightProgress, phase, result, variant]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
