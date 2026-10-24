"use client";

import { useEffect, useRef, type ReactNode } from "react";

const GALAXY = "data:image/jpeg;base64,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";
type Dot = { x: number; y: number };
type Grain = { source: Dot; start: number; life: number; angle: number };
type Waypoint = { x: number; y: number };
const TAU = Math.PI * 2;

function range(a: number, b: number): number {
  return a + Math.random() * (b - a);
}
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
function blend(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function GalaxyHeading({ children }: { children: ReactNode }) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const label = labelRef.current;
    const canvas = canvasRef.current;
    if (!label || !canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const ctx = context;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const galaxy = new Image();
    galaxy.src = GALAXY;

    let width = 0;
    let height = 0;
    let fontSize = 32;
    let radius = 38;
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let lastTick = 0;
    let segmentStarted = performance.now();
    let segmentDuration = 30000;
    let start: Waypoint = { x: 80, y: 65 };
    let goal: Waypoint = { x: 180, y: 65 };
    let orb: Waypoint = { x: 80, y: 65 };
    let roll = range(0, TAU);
    let tilt = 0;
    let lastOrb = { ...orb };
    let points: Dot[] = [];
    let grains: Grain[] = [];

    function chooseWaypoint(): Waypoint {
      return {
        x: range(radius * 0.9, Math.max(radius * 0.9 + 1, width - radius * 0.9)),
        y: range(height * 0.37, height * 0.63),
      };
    }

    function measure() {
      const bounds = label!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      width = bounds.width;
      height = bounds.height * 2.65;
      fontSize = parseFloat(getComputedStyle(label!).fontSize) || 32;
      radius = Math.min(fontSize * 1.11, width * 0.24, 88);
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Sample only actual visible glyph pixels, not the space around the text.
      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.ceil(width));
      mask.height = Math.max(1, Math.ceil(bounds.height));
      const m = mask.getContext("2d", { willReadFrequently: true });
      points = [];
      if (m) {
        const style = getComputedStyle(label!);
        m.font = style.fontWeight + " " + fontSize + "px " + style.fontFamily;
        m.fillStyle = "#ffffff";
        m.textBaseline = "middle";
        m.fillText(label!.textContent || "MIAV-922228", 0, bounds.height * 0.51);
        const pixels = m.getImageData(0, 0, mask.width, mask.height).data;
        for (let y = 1; y < mask.height; y += 2) {
          for (let x = 1; x < mask.width; x += 2) {
            if (pixels[(y * mask.width + x) * 4 + 3] > 160) {
              points.push({ x, y: y + (height - bounds.height) * 0.5 });
            }
          }
        }
      }

      // A new route is selected on every page visit, never a fixed start.
      orb = chooseWaypoint();
      start = { ...orb };
      goal = chooseWaypoint();
      lastOrb = { ...orb };
      segmentStarted = performance.now();
      segmentDuration = range(24000, 35000);
      grains = [];
    }

    function drawGrain(p: Grain, now: number, inside: boolean) {
      const progress = (now - p.start) / p.life;
      if (progress < 0 || progress >= 1) return;
      const a = p.angle;
      const target = {
        x: orb.x + Math.cos(a) * radius * 0.78,
        y: orb.y + Math.sin(a) * radius * 0.78,
      };
      const u = smooth(progress);
      const x = blend(p.source.x, target.x, u) + Math.sin(u * Math.PI) * 6;
      const y = blend(p.source.y, target.y, u) - Math.sin(u * Math.PI) * 4;
      const distance = Math.hypot(x - orb.x, y - orb.y);
      const within = distance < radius * 0.94;
      if (within !== inside) return;
      const alpha = (inside ? 0.24 : 0.62) * Math.sin(Math.PI * Math.min(progress, 0.97));
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = "#f5f9ff";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.58, fontSize * 0.023), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function render(now: number, deltaMs: number) {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      if (now - segmentStarted >= segmentDuration) {
        start = { ...goal };
        goal = chooseWaypoint();
        segmentStarted = now;
        segmentDuration = range(24000, 35000);
      }
      const k = smooth(Math.min(1, (now - segmentStarted) / segmentDuration));
      orb = { x: blend(start.x, goal.x, k), y: blend(start.y, goal.y, k) };
      const dx = orb.x - lastOrb.x;
      const dy = orb.y - lastOrb.y;
      roll += dx / Math.max(1, radius) * 0.90 + dy / Math.max(1, radius) * 0.18 + deltaMs * 0.000055;
      lastOrb = { ...orb };
      tilt = roll * 1.04;
      const face = Math.abs(Math.cos(tilt));

      // A few white grains, intermittently; front-facing views draw more.
      const pulse = Math.sin(now / 950) + 0.45 * Math.sin(now / 2200 + 1.3);
      if (pulse > 0.07 && points.length && Math.random() < 0.035 + 0.105 * Math.pow(face, 4)) {
        for (let i = 0; i < 16; i++) {
          const point = points[Math.floor(Math.random() * points.length)];
          const distance = Math.hypot(point.x - orb.x, point.y - orb.y);
          if (distance < radius * 2.7 && distance > radius * 0.53) {
            grains.push({
              source: point, start: now, life: range(2800, 4400),
              angle: Math.atan2(point.y - orb.y, point.x - orb.x) + 0.13,
            });
            break;
          }
        }
      }
      grains = grains.filter((p) => now - p.start < p.life).slice(-65);
      grains.forEach((p) => drawGrain(p, now, false));

      ctx.save();
      ctx.translate(orb.x, orb.y);
      const r = radius;
      // External shadow anchors the object as a glass sphere.
      const shadow = ctx.createRadialGradient(0, r * 0.17, r * 0.2, 0, r * 0.14, r * 1.18);
      shadow.addColorStop(0, "rgba(2,7,22,0.34)");
      shadow.addColorStop(1, "rgba(2,7,22,0)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.18, 0, TAU);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.clip();

      const glass = ctx.createRadialGradient(-r * 0.32, -r * 0.35, r * 0.02, r * 0.17, r * 0.25, r * 1.30);
      glass.addColorStop(0, "#1b3356");
      glass.addColorStop(0.50, "#101d34");
      glass.addColorStop(1, "#030916");
      ctx.fillStyle = glass;
      ctx.fillRect(-r, -r, 2 * r, 2 * r);

      // The same generated spiral-galaxy artwork used for the approved video.
      ctx.save();
      ctx.rotate(roll * 0.17);
      ctx.scale(1, Math.max(0.11, face));
      if (galaxy.complete && galaxy.naturalWidth > 0) {
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.97;
        ctx.drawImage(galaxy, -r * 0.70, -r * 0.70, r * 1.4, r * 1.4);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();

      // A real spiral galaxy has disk thickness and a central bulge edge-on.
      const side = 1 - face;
      if (side > 0.17) {
        ctx.save();
        ctx.rotate(roll * 0.17);
        ctx.globalAlpha = side * 0.77;
        const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.68);
        halo.addColorStop(0, "rgba(211,162,247,0.55)");
        halo.addColorStop(0.45, "rgba(108,107,196,0.24)");
        halo.addColorStop(1, "rgba(38,59,126,0)");
        ctx.scale(1, 0.33);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.73, 0, TAU);
        ctx.fill();
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.25);
        core.addColorStop(0, "rgba(248,229,255,0.68)");
        core.addColorStop(1, "rgba(169,130,230,0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.26, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      const glassShade = ctx.createLinearGradient(-r, -r, r, r);
      glassShade.addColorStop(0, "rgba(163,204,246,0.10)");
      glassShade.addColorStop(0.5, "rgba(12,21,39,0)");
      glassShade.addColorStop(1, "rgba(1,5,17,0.56)");
      ctx.fillStyle = glassShade;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      const gleam = ctx.createRadialGradient(-r * 0.43, -r * 0.56, 0, -r * 0.43, -r * 0.56, r * 0.24);
      gleam.addColorStop(0, "rgba(238,248,255,0.94)");
      gleam.addColorStop(0.20, "rgba(169,218,255,0.62)");
      gleam.addColorStop(1, "rgba(169,218,255,0)");
      ctx.fillStyle = gleam;
      ctx.beginPath();
      ctx.arc(-r * 0.43, -r * 0.56, r * 0.24, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(143,198,242,0.32)";
      ctx.lineWidth = Math.max(0.7, r * 0.019);
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r * 0.985, 0, TAU);
      ctx.stroke();
      grains.forEach((p) => drawGrain(p, now, true));
    }

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (document.hidden || !visible || media.matches || now - lastTick < 38) return;
      const previous = lastTick || now - 38;
      lastTick = now;
      render(now, now - previous);
    }
    function onMediaChange() {
      if (media.matches) {
        grains = [];
        ctx.clearRect(0, 0, width, height);
        // Keep an unobtrusive static sphere for motion-sensitive visitors.
        render(performance.now(), 40);
      }
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(label);
    const visibility = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    visibility.observe(label);
    media.addEventListener("change", onMediaChange);
    onMediaChange();
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      media.removeEventListener("change", onMediaChange);
    };
  }, []);

  return (
    <span ref={labelRef} className="relative inline-block max-w-full whitespace-nowrap">
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-1/2 z-[1] h-[265%] w-full -translate-y-1/2"
      />
    </span>
  );
}
