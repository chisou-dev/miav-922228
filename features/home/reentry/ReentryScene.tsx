"use client";

import { useEffect, useRef } from "react";
import type { AimingPull } from "./reentryAimInput";
import type { ReentryFrame, ReentryPhase, ReentryResult } from "./reentryTypes";

const HEAT_FLUX_VIS_MAX = 2.5e6;

function frameAtProgress(
  result: ReentryResult,
  progress: number,
): ReentryFrame {
  const frames = result.frames;
  if (frames.length === 0) {
    return {
      t: 0,
      altitudeM: 120_000,
      speedMps: 7500,
      x: 0,
      y: 120_000,
      z: 0,
      heatFluxWm2: 0,
      heatLoadJm2: 0,
      dynamicPressurePa: 0,
      integrity: 1,
    };
  }
  const idx = Math.min(
    frames.length - 1,
    Math.floor(progress * (frames.length - 1)),
  );
  return frames[idx];
}

function viewMapping(frames: ReentryFrame[], width: number, height: number) {
  const maxAlt = Math.max(125_000, ...frames.map((f) => f.y));
  const maxDown = Math.max(
    80_000,
    ...frames.map((f) => Math.abs(f.x)),
  );
  const surfaceY = height * 0.86;
  const topY = height * 0.14;

  const toCanvas = (frame: ReentryFrame) => {
    const x = width * 0.5 + (frame.x / maxDown) * width * 0.38;
    const altT = frame.y / maxAlt;
    const y = surfaceY - altT * (surfaceY - topY);
    return { x, y };
  };

  return { toCanvas, maxAlt, maxDown };
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: ReentryPhase,
  aimingPull: AimingPull | null,
  result: ReentryResult | null,
  flightProgress: number,
) {
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#070b10");
  sky.addColorStop(0.55, "#0c1420");
  sky.addColorStop(1, "#101a28");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const earthY = height * 0.88;
  const earthR = width * 0.95;

  ctx.save();
  ctx.beginPath();
  ctx.arc(width * 0.5, earthY + earthR * 0.92, earthR, Math.PI, 0);
  const earthGrad = ctx.createRadialGradient(
    width * 0.45,
    earthY,
    earthR * 0.1,
    width * 0.5,
    earthY,
    earthR,
  );
  earthGrad.addColorStop(0, "#2a4a62");
  earthGrad.addColorStop(0.55, "#1e3554");
  earthGrad.addColorStop(1, "#122438");
  ctx.fillStyle = earthGrad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(180, 210, 230, 0.22)";
  ctx.lineWidth = Math.max(1, height * 0.008);
  ctx.beginPath();
  ctx.arc(
    width * 0.5,
    earthY + earthR * 0.92,
    earthR * 0.98,
    Math.PI + 0.08,
    -0.08,
  );
  ctx.stroke();
  ctx.restore();

  const craftBaseX = width * 0.5;
  const craftBaseY = height * 0.14;

  let craftX = craftBaseX;
  let craftY = craftBaseY;
  let heat = 0;
  let integrity = 1;
  const fragments: { x: number; y: number; a: number }[] = [];

  if (result && result.frames.length > 0) {
    const { toCanvas } = viewMapping(result.frames, width, height);
    const start = toCanvas(result.frames[0]);
    craftX = start.x;
    craftY = start.y;

    if (phase === "flight" || phase === "result") {
      ctx.save();
      ctx.strokeStyle = "rgba(244, 239, 228, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const endIdx = Math.min(
        result.frames.length - 1,
        Math.floor(flightProgress * (result.frames.length - 1)),
      );
      for (let i = 0; i <= endIdx; i++) {
        const p = toCanvas(result.frames[i]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  if (phase === "flight" && result) {
    const frame = frameAtProgress(result, flightProgress);
    const { toCanvas } = viewMapping(result.frames, width, height);
    const p = toCanvas(frame);
    const wobble =
      frame.integrity < 0.65
        ? Math.sin(flightProgress * 40) * 3 * (1 - frame.integrity)
        : 0;
    craftX = p.x + wobble;
    craftY = p.y;
    heat = Math.min(1, frame.heatFluxWm2 / HEAT_FLUX_VIS_MAX);
    integrity = frame.integrity;

    if (result.outcome === "BREAK" && frame.integrity <= 0.2) {
      const spread = (1 - frame.integrity) * width * 0.06;
      fragments.push(
        { x: craftX - spread, y: craftY + spread * 0.2, a: 0.75 },
        { x: craftX + spread * 0.7, y: craftY + spread * 0.35, a: 0.6 },
        { x: craftX, y: craftY + spread * 0.55, a: 0.45 },
      );
    }
  }

  if (phase === "result" && result) {
    const frame = result.frames[result.frames.length - 1];
    const { toCanvas } = viewMapping(result.frames, width, height);
    const p = toCanvas(frame);
    craftX = p.x;
    craftY = p.y;
    heat = Math.min(1, frame.heatFluxWm2 / HEAT_FLUX_VIS_MAX);
    integrity = frame.integrity;
  }


  const drawCraft = (x: number, y: number, alpha: number, glow: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (glow > 0.05) {
      ctx.shadowColor = `rgba(255, 180, 120, ${0.35 + glow * 0.5})`;
      ctx.shadowBlur = 8 + glow * 22;
    }
    ctx.fillStyle = `rgba(244, 239, 228, ${0.85 + glow * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 4, y + 6);
    ctx.lineTo(x - 4, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  if (fragments.length > 0) {
    for (const frag of fragments) {
      drawCraft(frag.x, frag.y, frag.a, heat);
    }
  } else if (phase !== "result" || (result && result.outcome !== "BURN")) {
    const burnFade =
      result?.outcome === "BURN" && phase === "flight"
        ? Math.max(0, 1 - flightProgress * 1.1)
        : 1;
    if (burnFade > 0.02) {
      drawCraft(craftX, craftY, burnFade * Math.max(0.25, integrity), heat);
    }
  }
}

export function ReentryScene({
  phase,
  aimingPull,
  result,
  flightProgress,
}: {
  phase: ReentryPhase;
  aimingPull: AimingPull | null;
  result: ReentryResult | null;
  flightProgress: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const paint = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, w, h, phase, aimingPull, result, flightProgress);
    };

    paint();

    const ro = new ResizeObserver(() => paint());
    ro.observe(container);
    return () => ro.disconnect();
  }, [aimingPull, flightProgress, phase, result]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden />
    </div>
  );
}
