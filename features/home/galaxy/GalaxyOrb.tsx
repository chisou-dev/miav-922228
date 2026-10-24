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
    // Three independent full-circle axes; unlike the glass roll, these govern
    // the galaxy disk itself. Different slow rates prevent repetitive rocking.
    let galaxyYaw = rand(-0.45, 0.45);
    let galaxyPitch = rand(-0.25, 0.25);
    let galaxyRoll = rand(0, TAU);
    let quietUntil = 0;
    let yMax = 220;
    // Fixed 3-D stars around the disk; an edge-on galaxy is not empty space.
    // Generate once so the stars do not flicker between rendered frames.
    const galaxyHaloStars = Array.from({ length: 82 }, () => {
      const angle = rand(0, TAU);
      const altitude = rand(-1, 1);
      const distance = Math.cbrt(Math.random()) * 0.88;
      const across = Math.sqrt(1 - altitude * altitude) * distance;
      return {
        x: Math.cos(angle) * across,
        y: Math.sin(angle) * across,
        z: altitude * distance,
        brightness: rand(0.12, 0.44),
        size: rand(0.36, 0.86),
      };
    });
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
      // All three axes rotate slowly and independently (about 57s / 79s / 45s per turn).
      // The glass ball's roaming speed and rolling animation remain unchanged.
      galaxyYaw = (galaxyYaw + elapsed * 0.00011) % TAU;
      galaxyPitch = (galaxyPitch + elapsed * 0.00008) % TAU;
      galaxyRoll = (galaxyRoll + elapsed * 0.00014) % TAU;
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


    function galaxyOrientation() {
      // Orthographic projection of Rz(roll) * Rx(pitch) * Ry(yaw) applied to
      // a textured galaxy disk (its initial plane is XY). This rotates through
      // genuine front, oblique, edge-on and back-facing orientations instead
      // of merely oscillating a flat image.
      const cy = Math.cos(galaxyYaw);
      const sy = Math.sin(galaxyYaw);
      const cp = Math.cos(galaxyPitch);
      const sp = Math.sin(galaxyPitch);
      const cr = Math.cos(galaxyRoll);
      const sr = Math.sin(galaxyRoll);
      const a = cr * cy - sr * sp * sy;
      const b = sr * cy + cr * sp * sy;
      const c = -sr * cp;
      const d = cr * cp;
      // Project the 3-D halo, which occupies space above/below the disk.
      const e = cr * sy + sr * sp * cy;
      const f = sr * sy - cr * sp * cy;
      // True major axis of the projected circular disk; this stays steady
      // as it passes from face-on to edge-on.
      const xx = a * a + c * c;
      const xy = a * b + c * d;
      const yy = b * b + d * d;
      const longAxis = 0.5 * Math.atan2(2 * xy, xx - yy);
      return { a, b, c, d, e, f, longAxis, face: Math.abs(cy * cp) };
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

      const orientation = galaxyOrientation();
      const face = orientation.face;
      const edge = 1 - face;

      // A galaxy has a thick stellar disk, a brighter central bulge and a
      // surrounding halo. Draw their volume BEHIND the sharp spiral texture,
      // becoming more visible as the disk turns edge-on. Keep the sphere size
      // unchanged and avoid the previous flat pink line / empty dark bubble.
      if (edge > 0.05) {
        ctx.save();
        ctx.rotate(orientation.longAxis);

        // Very diffuse stars above and below the thin disk.
        ctx.save();
        ctx.scale(1, 0.62);
        const halo = ctx.createRadialGradient(0, 0, r * 0.06, 0, 0, r * 0.93);
        halo.addColorStop(0, `rgba(116,115,212,${0.24 * edge})`);
        halo.addColorStop(0.42, `rgba(71,94,177,${0.19 * edge})`);
        halo.addColorStop(1, "rgba(32,52,108,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.93, 0, TAU);
        ctx.fill();
        ctx.restore();

        // Thick but still recognisably flattened stellar disk.
        ctx.save();
        ctx.scale(1, 0.30 + 0.12 * face);
        const thickDisk = ctx.createRadialGradient(0, 0, r * 0.015, 0, 0, r * 0.83);
        thickDisk.addColorStop(0, `rgba(219,180,246,${0.30 * edge})`);
        thickDisk.addColorStop(0.26, `rgba(142,115,224,${0.34 * edge})`);
        thickDisk.addColorStop(0.72, `rgba(75,109,192,${0.22 * edge})`);
        thickDisk.addColorStop(1, "rgba(46,72,134,0)");
        ctx.fillStyle = thickDisk;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.83, 0, TAU);
        ctx.fill();
        ctx.restore();

        // Gently enlarged nucleus: lens-shaped when seen sideways, never a dot.
        ctx.save();
        ctx.scale(1, 0.67);
        const bulge = ctx.createRadialGradient(0, 0, r * 0.008, 0, 0, r * 0.32);
        bulge.addColorStop(0, `rgba(250,224,245,${0.62 * edge})`);
        bulge.addColorStop(0.28, `rgba(209,166,244,${0.54 * edge})`);
        bulge.addColorStop(0.76, `rgba(142,111,221,${0.20 * edge})`);
        bulge.addColorStop(1, "rgba(89,87,172,0)");
        ctx.fillStyle = bulge;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.32, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.restore();
      }

      // Existing approved spiral image: preserve all face-on details and the
      // actual three-axis projection, rather than replacing it with a cloud.
      ctx.save();
      ctx.transform(orientation.a, orientation.b, orientation.c, orientation.d, 0, 0);
      if (galaxy.complete && galaxy.naturalWidth > 0) {
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(galaxy, -r * 0.76, -r * 0.76, r * 1.52, r * 1.52);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();

      // A soft, faintly textured continuation of the real spiral disk adds
      // physical thickness when edge-on, without making it look face-on.
      if (edge > 0.27 && galaxy.complete && galaxy.naturalWidth > 0) {
        ctx.save();
        ctx.rotate(orientation.longAxis);
        ctx.scale(1, 0.30);
        ctx.globalAlpha = 0.21 * Math.pow((edge - 0.27) / 0.73, 1.2);
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(galaxy, -r * 0.70, -r * 0.70, r * 1.40, r * 1.40);
        ctx.restore();
      }

      // Independent 3-D stellar halo. Remains visible off the disk plane and
      // rotates coherently with the galaxy in all directions.
      for (const star of galaxyHaloStars) {
        const sx = (orientation.a * star.x + orientation.c * star.y + orientation.e * star.z) * r;
        const sy = (orientation.b * star.x + orientation.d * star.y + orientation.f * star.z) * r;
        if (sx * sx + sy * sy > r * r * 0.88) continue;
        ctx.fillStyle = `rgba(177,199,249,${star.brightness * (0.56 + 0.38 * edge)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, TAU);
        ctx.fill();
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
      const face = galaxyOrientation().face;
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
