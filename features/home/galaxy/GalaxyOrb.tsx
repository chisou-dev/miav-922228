"use client";

import { useEffect, useRef } from "react";
import { GALAXY } from "./GalaxyHeading";

type Point = { x: number; y: number };
type Grain = { source: Point; born: number; life: number; angle: number };
const TAU = Math.PI * 2;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

export function GalaxyOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const ctx = context;
    const section = surface.parentElement;
    if (!section) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const galaxy = new Image();
    galaxy.src = GALAXY;

    let width = 0;
    let height = 0;
    let radius = 46;
    let frame = 0;
    let frameTime = 0;
    let isVisible = true;
    let sectionBounds = section.getBoundingClientRect();
    let titleBounds: DOMRect | null = null;
    let textPixels: Point[] = [];
    let grains: Grain[] = [];
    let from: Point = { x: 0, y: 0 };
    let to: Point = { x: 0, y: 0 };
    let orb: Point = { x: 0, y: 0 };
    let prev: Point = { x: 0, y: 0 };
    let started = performance.now();
    let duration = 29000;
    let segment = 0;
    let rolling = rand(0, TAU);
    let galaxySpin = rand(0, TAU);
    let quietUntil = 0;
    let yMax = 220;
    const reduced = () => media.matches;

    const pointDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

    function newWaypoint(previous?: Point): Point {
      const xMin = radius + 6;
      const xMax = Math.max(xMin + 1, width - radius - 6);
      const yMin = radius + 6;
      const yTop = Math.max(yMin + 1, yMax);
      let result: Point = { x: rand(xMin, xMax), y: rand(yMin, yTop) };
      for (let tries = 0; tries < 24; tries++) {
        const candidate = { x: rand(xMin, xMax), y: rand(yMin, yTop) };
        if (previous && pointDistance(candidate, previous) < Math.min(width * 0.29, 150)) continue;
        // Most of the path crosses the open area. The title is visited occasionally.
        if (titleBounds && Math.random() < 0.82) {
          const left = titleBounds.left - sectionBounds.left;
          const top = titleBounds.top - sectionBounds.top;
          if (
            candidate.x > left - radius * 0.75 &&
            candidate.x < left + titleBounds.width + radius * 0.75 &&
            candidate.y > top - radius * 0.9 &&
            candidate.y < top + titleBounds.height + radius * 0.9
          ) continue;
        }
        result = candidate;
        break;
      }
      return result;
    }

    function measure() {
      sectionBounds = section!.getBoundingClientRect();
      width = sectionBounds.width;
      height = sectionBounds.height;
      if (!width || !height) return;
      const title = section!.querySelector<HTMLElement>("[data-galaxy-title]");
      titleBounds = title ? title.getBoundingClientRect() : null;
      const fs = title ? parseFloat(getComputedStyle(title).fontSize) : 32;
      radius = clamp(fs * 1.22, 35, 78);
      const nav = section!.querySelector<HTMLElement>("nav");
      const navTop = nav ? nav.getBoundingClientRect().top - sectionBounds.top : height;
      yMax = clamp(Math.min(height * 0.68, navTop - radius * 1.25), radius + 8, Math.max(radius + 8, height - radius - 6));
      const dpi = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas!.width = Math.max(1, Math.round(width * dpi));
      canvas!.height = Math.max(1, Math.round(height * dpi));
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

      // True visible title-pixel positions for a restrained text-to-stars interaction.
      textPixels = [];
      if (title && titleBounds && titleBounds.width > 0) {
        const mask = document.createElement("canvas");
        mask.width = Math.min(2000, Math.ceil(titleBounds.width));
        mask.height = Math.min(200, Math.ceil(titleBounds.height));
        const m = mask.getContext("2d", { willReadFrequently: true });
        if (m) {
          const style = getComputedStyle(title);
          m.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          m.fillStyle = "white";
          m.textBaseline = "middle";
          m.fillText(title.textContent ?? "MIAV-922228", 0, mask.height * 0.49);
          const pixels = m.getImageData(0, 0, mask.width, mask.height).data;
          const ox = titleBounds.left - sectionBounds.left;
          const oy = titleBounds.top - sectionBounds.top;
          for (let yy = 1; yy < mask.height; yy += 2) {
            for (let xx = 1; xx < mask.width; xx += 2) {
              if (pixels[(yy * mask.width + xx) * 4 + 3] > 170) {
                textPixels.push({ x: ox + xx, y: oy + yy });
              }
            }
          }
        }
      }
      orb = newWaypoint();
      from = { ...orb };
      to = newWaypoint(orb);
      prev = { ...orb };
      started = performance.now();
      duration = rand(22000, 35500);
      grains = [];
      frameTime = 0;
      segment = 0;
    }

    // The curved motion changes both horizontal and vertical directions.
    function advance(now: number, elapsed: number) {
      if (now - started >= duration) {
        from = { ...to };
        to = newWaypoint(from);
        started = now;
        duration = rand(22000, 35500);
        segment += 1;
      }
      const u = smooth(clamp((now - started) / duration, 0, 1));
      const bend = Math.sin(u * Math.PI) * Math.min(height * 0.10, 65) * Math.sin(segment * 2.31 + 1.7);
      orb = {
        x: mix(from.x, to.x, u) + bend * 0.46,
        y: mix(from.y, to.y, u) - bend * 0.65,
      };
      orb.x = clamp(orb.x, radius + 2, width - radius - 2);
      orb.y = clamp(orb.y, radius + 2, Math.max(radius + 2, yMax + radius * 0.20));

      const dx = orb.x - prev.x;
      const dy = orb.y - prev.y;
      // Roll is visually readable even when the orb travels very slowly.
      rolling += Math.hypot(dx, dy) / Math.max(1, radius) * 2.6 + elapsed * 0.00044;
      // The galaxy spins independently and noticeably faster (~16 seconds per turn).
      galaxySpin += elapsed * 0.00039;
      prev = { ...orb };
    }

    function emit(now: number, face: number) {
      grains = grains.filter((p) => now - p.born < p.life).slice(-36);
      if (now < quietUntil || !textPixels.length || Math.sin(now / 900) < -0.15) return;
      if (Math.random() > 0.022 + 0.050 * Math.pow(face, 3)) return;
      for (let attempt = 0; attempt < 18; attempt++) {
        const source = textPixels[Math.floor(Math.random() * textPixels.length)];
        const d = pointDistance(source, orb);
        if (d > radius * 2.95 || d < radius * 0.67) continue;
        grains.push({
          source, born: now, life: rand(2500, 3900),
          angle: Math.atan2(source.y - orb.y, source.x - orb.x) + rand(-0.06, 0.11),
        });
        if (Math.random() < 0.16) quietUntil = now + rand(1500, 3500);
        break;
      }
    }

    function drawGrains(now: number, inside: boolean) {
      for (const p of grains) {
        const t = (now - p.born) / p.life;
        if (t < 0 || t >= 1) continue;
        const u = smooth(t);
        const endX = orb.x + Math.cos(p.angle) * radius * 0.81;
        const endY = orb.y + Math.sin(p.angle) * radius * 0.81;
        const x = mix(p.source.x, endX, u) + Math.sin(Math.PI * u) * 5;
        const y = mix(p.source.y, endY, u) - Math.sin(Math.PI * u) * 3;
        if ((Math.hypot(x - orb.x, y - orb.y) <= radius * 0.98) !== inside) continue;
        ctx.fillStyle = `rgba(244,249,255,${(inside ? 0.38 : 0.68) * Math.sin(Math.PI * t)})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, TAU);
        ctx.fill();
      }
    }

    function drawSphere() {
      const { x, y } = orb;
      const r = radius;
      ctx.save();
      ctx.translate(x, y);
      const shadow = ctx.createRadialGradient(0, r * 0.14, r * 0.18, 0, r * 0.16, r * 1.21);
      shadow.addColorStop(0, "rgba(1,5,17,0.39)");
      shadow.addColorStop(1, "rgba(1,5,17,0)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.21, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.clip();

      const glass = ctx.createRadialGradient(-r * 0.32, -r * 0.4, r * 0.02, r * 0.20, r * 0.25, r * 1.35);
      glass.addColorStop(0, "#1c365a");
      glass.addColorStop(0.49, "#111e35");
      glass.addColorStop(1, "#030915");
      ctx.fillStyle = glass;
      ctx.fillRect(-r, -r, r * 2, r * 2);

      const face = Math.abs(Math.cos(rolling * 0.82));
      const slant = 0.20 * Math.sin(rolling * 0.37);
      ctx.save();
      ctx.rotate(slant);
      ctx.scale(1, Math.max(0.15, face));
      ctx.rotate(galaxySpin);
      if (galaxy.complete && galaxy.naturalWidth > 0) {
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(galaxy, -r * 0.76, -r * 0.76, r * 1.52, r * 1.52);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();

      // Visible side-on bulge and faint surrounding halo, not just a luminous line.
      const edge = 1 - face;
      if (edge > 0.14) {
        ctx.save();
        ctx.rotate(slant);
        ctx.globalAlpha = edge * 0.82;
        ctx.scale(1, 0.30);
        const disk = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.75);
        disk.addColorStop(0, "rgba(225,181,246,0.73)");
        disk.addColorStop(0.3, "rgba(114,104,213,0.42)");
        disk.addColorStop(1, "rgba(36,54,116,0)");
        ctx.fillStyle = disk;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.74, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      const shade = ctx.createLinearGradient(-r, -r, r, r);
      shade.addColorStop(0, "rgba(174,216,255,0.13)");
      shade.addColorStop(0.52, "rgba(5,16,35,0)");
      shade.addColorStop(1, "rgba(1,5,15,0.56)");
      ctx.fillStyle = shade;
      ctx.fillRect(-r, -r, 2 * r, 2 * r);

      // Tiny orbiting surface highlights help the sphere visibly roll,
      // while the strongest reflection remains tied to the light source.
      const sx = r * (0.50 * Math.sin(rolling * 0.72));
      const sy = r * (0.18 * Math.cos(rolling * 0.72));
      const orbitGlint = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.075);
      orbitGlint.addColorStop(0, "rgba(182,220,255,0.58)");
      orbitGlint.addColorStop(1, "rgba(182,220,255,0)");
      ctx.fillStyle = orbitGlint;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.075, 0, TAU);
      ctx.fill();

      const gleam = ctx.createRadialGradient(-r * 0.43, -r * 0.56, 0, -r * 0.43, -r * 0.56, r * 0.23);
      gleam.addColorStop(0, "rgba(243,249,255,0.93)");
      gleam.addColorStop(0.23, "rgba(159,214,255,0.57)");
      gleam.addColorStop(1, "rgba(159,214,255,0)");
      ctx.fillStyle = gleam;
      ctx.beginPath();
      ctx.arc(-r * 0.43, -r * 0.56, r * 0.23, 0, TAU);
      ctx.fill();

      ctx.restore();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.985, 0, TAU);
      ctx.strokeStyle = "rgba(138,197,246,0.32)";
      ctx.lineWidth = Math.max(0.7, r * 0.016);
      ctx.stroke();
    }

    function render(now: number, elapsed: number) {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      if (!reduced()) advance(now, elapsed);
      const face = Math.abs(Math.cos(rolling * 0.82));
      if (!reduced()) emit(now, face);
      drawGrains(now, false);
      drawSphere();
      drawGrains(now, true);
    }

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (document.hidden || !isVisible || reduced() || now - frameTime < 38) return;
      const elapsed = Math.min(100, frameTime ? now - frameTime : 40);
      frameTime = now;
      render(now, elapsed);
    }

    function staticFrame() {
      if (reduced()) {
        grains = [];
        frameTime = 0;
        render(performance.now(), 0);
      }
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    const visibility = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
      if (isVisible) frameTime = 0;
    });
    visibility.observe(section);
    media.addEventListener("change", staticFrame);
    galaxy.addEventListener("load", staticFrame);
    if (document.fonts) void document.fonts.ready.then(() => measure());
    staticFrame();
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      media.removeEventListener("change", staticFrame);
      galaxy.removeEventListener("load", staticFrame);
    };
  }, []);

  return (
    <div ref={surfaceRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2]">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
