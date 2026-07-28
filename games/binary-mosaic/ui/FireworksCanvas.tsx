"use client";

import { useEffect, useRef, useState } from "react";
import { ParticlePool, seedFireworkPool } from "@/engine/ParticlePool";
import { useGameLoop } from "@/hooks/useGameLoop";

type Props = {
  active: boolean;
  durationMs: number;
  sourceBits: (0 | 1)[];
  onBurst?: () => void;
};

const POOL = new ParticlePool(140);

export function FireworksCanvas({
  active,
  durationMs,
  sourceBits,
  onBurst,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(0);
  const seededRef = useRef(false);
  const burstRef = useRef(onBurst);
  const [running, setRunning] = useState(false);
  burstRef.current = onBurst;

  useEffect(() => {
    if (!active) {
      seededRef.current = false;
      setRunning(false);
      POOL.reset();
      return;
    }
    if (seededRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    seededRef.current = true;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    seedFireworkPool(POOL, rect.width, rect.height, sourceBits);
    startRef.current = performance.now();
    setRunning(true);
    burstRef.current?.();
  }, [active, sourceBits]);

  useEffect(() => {
    if (!active) return;
    return () => {
      seededRef.current = false;
      setRunning(false);
      POOL.reset();
    };
  }, [active]);

  useGameLoop((deltaMs) => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const elapsed = performance.now() - startRef.current;
    if (elapsed > durationMs) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setRunning(false);
      return;
    }

    const dpr = canvas.width / (canvas.clientWidth || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    POOL.update(deltaMs / 1000);
    POOL.draw(ctx, canvas.clientWidth, canvas.clientHeight);
  }, running);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="mosaic-fireworks-canvas"
      aria-hidden="true"
    />
  );
}
