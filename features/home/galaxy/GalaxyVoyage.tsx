"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GALAXY } from "./GalaxyHeading";

type Point = { x: number; y: number };
type Star = { x: number; y: number; r: number; alpha: number; speed: number; phase: number; hue: number };
type Dust = { x: number; y: number; t: number; speed: number; drift: number };
type Shard = { angle: number; spread: number; distance: number; spin: number };

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => { const v = clamp(t, 0, 1); return v * v * (3 - 2 * v); };
const NASA_M100 = "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia15/pia15910/PIA15910.jpg?fit=clip&w=1200";
const NASA_NGC2841 = "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia12/pia12001/PIA12001.jpg?fit=clip&w=1200";
const SEGMENT_TAPS = 20;
const FINAL_STEP = 60;
const SHATTER_MS = 2250;
const FINAL_HOLD_MS = 30_000;
const IDLE_MS = 45_000;

function sampleTextLocations(): Point[] {
  const root = document.querySelector("[data-galaxy-title]")?.closest("section");
  if (!root) return [];
  const points: Point[] = [];
  // Only sample text currently visible on the screen; the real DOM text is
  // untouched. The streaks merely give an illusion of letters shedding sand.
  const nodes = root.querySelectorAll("h1, p, nav a, aside span");
  for (const el of nodes) {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const rect = el.getBoundingClientRect();
    const left = Math.max(rect.left, 0);
    const right = Math.min(rect.right, window.innerWidth);
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, window.innerHeight);
    if (right <= left || bottom <= top) continue;
    const count = Math.min(48, Math.max(8, Math.floor(((right - left) * (bottom - top)) / 290)));
    for (let n = 0; n < count; n++) {
      points.push({ x: mix(left, right, Math.random()), y: mix(top, bottom, Math.random()) });
    }
  }
  return points;
}

export function GalaxyVoyage({
  origin, onExit,
}: {
  origin: { x: number; y: number; radius: number };
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exitRef = useRef(onExit);
  const advanceRef = useRef<() => void>(() => {});
  exitRef.current = onExit;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionScale = reduced ? 0 : 1;
    // Lock scrolling only while the full-screen journey is active; restore
    // exactly the previous value on return without changing the home layout.
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let running = true;
    let frame = 0;
    let previous = performance.now();
    const opened = previous;
    let viewWidth = window.innerWidth;
    let viewHeight = window.innerHeight;
    let progress = 0;
    let target = 0;
    let firstRotation = Math.random() * TAU;
    let nextRotation = Math.random() * TAU;
    let finalTimer: number | undefined;
    let idleTimer: number | undefined;
    let lastAdvanceAt = 0;

    // The NASA images really are telescope observations. They are composited
    // as an artistic journey, not as an accurate atlas of galaxy positions.
    const globe = new Image();
    globe.src = GALAXY;
    const first = new Image();
    first.src = NASA_M100;
    const second = new Image();
    second.src = NASA_NGC2841;
    const prepared = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
    const selectedText = sampleTextLocations();
    const dust: Dust[] = selectedText.slice(0, 170).map((p) => ({
      ...p, t: -Math.random() * 0.30, speed: 0.75 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 44,
    }));
    const shards: Shard[] = Array.from({ length: 11 }, (_, i) => ({
      angle: (i / 11) * TAU + (Math.random() - 0.5) * 0.21,
      spread: 0.23 + Math.random() * 0.32,
      distance: 0.7 + Math.random() * 0.65,
      spin: (Math.random() - 0.5) * 0.9,
    }));
    const stars: Star[] = Array.from({ length: 540 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.35 + Math.random() * 1.24,
      alpha: 0.22 + Math.random() * 0.70,
      speed: 0.00043 + Math.random() * 0.0017,
      phase: Math.random() * TAU,
      hue: [0, 12, 30, 46, 190, 205, 225, 268][Math.floor(Math.random() * 8)],
    }));

    function resize() {
      viewWidth = window.innerWidth;
      viewHeight = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      canvas!.width = Math.round(viewWidth * dpr);
      canvas!.height = Math.round(viewHeight * dpr);
      canvas!.style.width = viewWidth + "px";
      canvas!.style.height = viewHeight + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // The source photos are rectangular. A cached circular feather removes
    // the hard edges *before* screen-compositing them into continuous space.
    function preparedGalaxy(img: HTMLImageElement): HTMLCanvasElement | null {
      if (!img.complete || !img.naturalWidth || !img.naturalHeight) return null;
      const cache = prepared.get(img);
      if (cache) return cache;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const n = Math.min(1400, side);
      const output = document.createElement("canvas");
      output.width = n;
      output.height = n;
      const o = output.getContext("2d");
      if (!o) return null;
      o.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2,
        side, side, 0, 0, n, n);
      o.globalCompositeOperation = "destination-in";
      const feather = o.createRadialGradient(n / 2, n / 2, n * 0.23, n / 2, n / 2, n * 0.485);
      feather.addColorStop(0, "#fff");
      feather.addColorStop(0.42, "rgba(255,255,255,0.95)");
      feather.addColorStop(0.76, "rgba(255,255,255,0.42)");
      feather.addColorStop(1, "rgba(255,255,255,0)");
      o.fillStyle = feather;
      o.fillRect(0, 0, n, n);
      prepared.set(img, output);
      return output;
    }

    function galaxyImage(img: HTMLImageElement, x: number, y: number, size: number, rotation: number, alpha = 1) {
      if (size < 1 || alpha <= 0) return;
      const source = preparedGalaxy(img);
      if (!source) return;
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(rotation);
      ctx!.globalAlpha = clamp(alpha, 0, 1);
      ctx!.globalCompositeOperation = "screen";
      ctx!.drawImage(source, -size / 2, -size / 2, size, size);
      ctx!.restore();
    }

    function starscape(now: number, visible: number, final: boolean) {
      // A dark sky can appear in early stages, while the final scene is only
      // many tiny lights in varied hues with independent gentle scintillation.
      for (const star of stars) {
        const x = star.x * viewWidth;
        const y = star.y * viewHeight;
        const phase = (now * star.speed + star.phase);
        const shimmer = 0.66 + 0.34 * Math.sin(phase);
        const a = Math.min(1, star.alpha * shimmer * visible * (final ? 1 : 0.54));
        if (a <= 0.012) continue;
        ctx!.fillStyle = "hsla(" + star.hue + ",78%," +
          (star.hue === 225 ? 88 : 82) + "%," + a.toFixed(3) + ")";
        ctx!.beginPath();
        ctx!.arc(x, y, star.r * (final ? 1 : 0.68), 0, TAU);
        ctx!.fill();
        if (final && star.r > 1.2 && a > 0.54) {
          ctx!.strokeStyle = "hsla(" + star.hue + ",75%,89%," + (a * 0.28).toFixed(3) + ")";
          ctx!.lineWidth = 0.55;
          ctx!.beginPath();
          ctx!.moveTo(x - star.r * 2.2, y);
          ctx!.lineTo(x + star.r * 2.2, y);
          ctx!.moveTo(x, y - star.r * 2.2);
          ctx!.lineTo(x, y + star.r * 2.2);
          ctx!.stroke();
        }
      }
    }

    function drawGlass(x: number, y: number, r: number, now: number) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.beginPath();
      ctx!.arc(0, 0, r, 0, TAU);
      ctx!.clip();
      const shell = ctx!.createRadialGradient(-r * 0.28, -r * 0.38, 0, r * 0.18, r * 0.25, r * 1.28);
      shell.addColorStop(0, "#1a3157");
      shell.addColorStop(0.52, "#0e1b30");
      shell.addColorStop(1, "#020714");
      ctx!.fillStyle = shell;
      ctx!.fillRect(-r, -r, 2 * r, 2 * r);
      ctx!.save();
      ctx!.rotate(now * 0.000065);
      ctx!.globalCompositeOperation = "screen";
      if (globe.complete && globe.naturalWidth) {
        ctx!.drawImage(globe, -r * 0.78, -r * 0.78, r * 1.56, r * 1.56);
      }
      ctx!.restore();
      const shine = ctx!.createRadialGradient(-r * 0.42, -r * 0.55, 0, -r * 0.42, -r * 0.55, r * 0.23);
      shine.addColorStop(0, "rgba(240,250,255,0.9)");
      shine.addColorStop(0.24, "rgba(153,210,255,0.55)");
      shine.addColorStop(1, "rgba(153,210,255,0)");
      ctx!.fillStyle = shine;
      ctx!.fillRect(-r, -r, r * 2, r * 2);
      ctx!.restore();
      ctx!.strokeStyle = "rgba(159,207,245,0.57)";
      ctx!.lineWidth = Math.max(1, r * 0.013);
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, TAU);
      ctx!.stroke();
    }

    function drawShatter(now: number) {
      const age = now - opened;
      const x = origin.x, y = origin.y, r = origin.radius;
      if (age < 900) {
        drawGlass(x, y, r * (1 + 0.035 * Math.sin(age * 0.042) * motionScale), now);
        const grow = ease((age - 175) / 590);
        if (grow > 0) {
          ctx!.save();
          ctx!.translate(x, y);
          ctx!.strokeStyle = "rgba(230,246,255," + (grow * 0.88) + ")";
          ctx!.lineWidth = 1.2;
          for (const shard of shards) {
            const a = shard.angle;
            ctx!.beginPath();
            ctx!.moveTo(Math.cos(a) * r * 0.11, Math.sin(a) * r * 0.11);
            ctx!.lineTo(Math.cos(a + 0.10) * r * (0.34 + 0.16 * grow), Math.sin(a + 0.10) * r * (0.34 + 0.16 * grow));
            ctx!.lineTo(Math.cos(a) * r * grow, Math.sin(a) * r * grow);
            ctx!.stroke();
          }
          ctx!.restore();
        }
      } else if (age < 1780) {
        const p = ease((age - 900) / 870);
        ctx!.save();
        ctx!.translate(x, y);
        ctx!.strokeStyle = "rgba(174,222,255," + ((1-p) * 0.6) + ")";
        ctx!.fillStyle = "rgba(156,210,250," + ((1-p) * 0.095) + ")";
        ctx!.lineWidth = 1.05;
        for (const shard of shards) {
          const a = shard.angle;
          const ox = Math.cos(a) * r * shard.distance * p * 1.75;
          const oy = Math.sin(a) * r * shard.distance * p * 1.75;
          ctx!.save();
          ctx!.translate(ox, oy);
          ctx!.rotate(p * shard.spin);
          ctx!.beginPath();
          ctx!.moveTo(0, 0);
          ctx!.lineTo(Math.cos(a) * r * shard.spread, Math.sin(a) * r * shard.spread);
          ctx!.lineTo(Math.cos(a + 0.23) * r * shard.spread * 0.62, Math.sin(a + 0.23) * r * shard.spread * 0.62);
          ctx!.closePath();
          ctx!.fill();
          ctx!.stroke();
          ctx!.restore();
        }
        ctx!.restore();
      }

      // A narrow hourglass-like stream of dust originating in unchanged text.
      const stream = ease((age - 370) / 1300);
      for (const grain of dust) {
        const t = clamp((stream - grain.t) * grain.speed, 0, 1);
        if (t <= 0 || t >= 1) continue;
        const curve = Math.sin(Math.PI * t);
        const gx = mix(grain.x, x, ease(t)) + grain.drift * curve * (1-t);
        const gy = mix(grain.y, y, ease(t)) - 22 * curve;
        ctx!.fillStyle = "rgba(236,247,255," + (Math.sin(Math.PI * t) * 0.7).toFixed(3) + ")";
        ctx!.beginPath();
        ctx!.arc(gx, gy, 0.5 + 0.9 * (1 - t), 0, TAU);
        ctx!.fill();
      }
    }

    function draw(now: number, dt: number) {
      if (!running) return;
      ctx!.clearRect(0, 0, viewWidth, viewHeight);
      const age = now - opened;
      const short = Math.min(viewWidth, viewHeight);

      if (age < SHATTER_MS) {
        // Original text and site remain visible under this transparent
        // layer. The last half-second darkens the stage into black space.
        const cover = ease((age - 1250) / 950);
        ctx!.fillStyle = "rgba(0,3,12," + cover.toFixed(3) + ")";
        ctx!.fillRect(0, 0, viewWidth, viewHeight);
        drawShatter(now);
        const emerge = ease((age - 1260) / 910);
        if (emerge > 0) galaxyImage(first.complete && first.naturalWidth ? first : globe, mix(origin.x, viewWidth * 0.5, emerge),
          mix(origin.y, viewHeight * 0.5, emerge),
          mix(origin.radius * 1.6, short * 0.70, emerge),
          firstRotation, emerge);
        return;
      }

      ctx!.fillStyle = "#01040c";
      ctx!.fillRect(0, 0, viewWidth, viewHeight);
      progress = mix(progress, target, reduced ? 1 : Math.min(1, dt / 210));
      if (Math.abs(progress - target) < 0.005) progress = target;
      const s = progress;

      const finalFactor = ease((s - 44) / 16);
      starscape(now, 0.35 + 0.65 * ease(s / FINAL_STEP), finalFactor > 0.98);

      // First galaxy: starts with its ENTIRE spiral visible at 70% of the
      // screen's short dimension; after ~20 taps it becomes a distant point.
      const firstSize = short * 0.70 * Math.pow(0.77, Math.min(s, SEGMENT_TAPS));
      if (firstSize > short * 0.17 && !reduced) firstRotation += dt * 0.000052;
      galaxyImage(first.complete && first.naturalWidth ? first : globe,
        mix(viewWidth * 0.5, viewWidth * 0.30, ease(s / 20)),
        mix(viewHeight * 0.5, viewHeight * 0.32, ease(s / 20)),
        firstSize, firstRotation, clamp((40 - s) / 16, 0, 1));

      // Another real galaxy is first a tiny distant object (never a large
      // sudden fade-in). It grows as the camera passes it, then recedes.
      let secondSize = 0;
      if (s >= 14 && s < 35) {
        secondSize = short * 0.008 * Math.pow(0.70 / 0.008, ease((s - 14) / 21));
      } else if (s >= 35) {
        secondSize = short * 0.70 * Math.pow(0.76, Math.min(25, s - 35));
      }
      if (secondSize > short * 0.17 && !reduced) nextRotation += dt * 0.000046;
      const near = ease((s - 14) / 21);
      const flyBy = ease((s - 35) / 25);
      galaxyImage(second,
        mix(viewWidth * 0.86, viewWidth * 0.56, near) + flyBy * viewWidth * 0.32,
        mix(viewHeight * 0.35, viewHeight * 0.53, near) - flyBy * viewHeight * 0.21,
        secondSize, nextRotation, clamp((60 - s) / 10, 0, 1));

      // Final stage: the NASA deep field is intentionally NOT shown.
      // Only multi-colour independent sparkling stars survive.
      if (finalFactor > 0) {
        ctx!.fillStyle = "rgba(0,1,7," + (0.15 * finalFactor).toFixed(3) + ")";
        ctx!.fillRect(0, 0, viewWidth, viewHeight);
      }
    }

    function stepForward() {
      const now = performance.now();
      if (now - lastAdvanceAt < 120 || now - opened < SHATTER_MS - 80) return;
      lastAdvanceAt = now;
      if (target >= FINAL_STEP) return;
      target += 1;
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      if (target >= FINAL_STEP) {
        finalTimer = window.setTimeout(() => exitRef.current(), FINAL_HOLD_MS);
      } else {
        // Intermediate scenes remain entirely tap-driven. This is a safety
        // return for an abandoned modal, not automatic camera movement.
        idleTimer = window.setTimeout(() => exitRef.current(), IDLE_MS);
      }
    }
    advanceRef.current = stepForward;
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); exitRef.current(); }
      else if (event.key === " " || event.key === "Enter") {
        event.preventDefault(); stepForward();
      }
    }
    function tick(now: number) {
      if (!running) return;
      frame = requestAnimationFrame(tick);
      if (document.hidden || now - previous < 32) return;
      const dt = Math.min(100, now - previous);
      previous = now;
      draw(now, dt);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keydown);
    idleTimer = window.setTimeout(() => exitRef.current(), IDLE_MS);
    frame = requestAnimationFrame(tick);
    return () => {
      running = false;
      document.body.style.overflow = previousBodyOverflow;
      cancelAnimationFrame(frame);
      if (finalTimer !== undefined) clearTimeout(finalTimer);
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keydown);
    };
  }, [origin.x, origin.y, origin.radius]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galaxy voyage. Click to travel through space."
      onClick={(event) => {
        if (event.target === event.currentTarget || event.target === canvasRef.current) {
          advanceRef.current();
        }
      }}
      className="fixed inset-0 select-none"
      style={{ zIndex: 2147483000, touchAction: "manipulation", background: "transparent" }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block" />
      <button
        type="button"
        aria-label="Return to MIAV home"
        title="Return home"
        onClick={(event) => { event.stopPropagation(); onExit(); }}
        className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#071426]/55 text-2xl text-white/90 backdrop-blur-sm hover:bg-[#102944] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        style={{ zIndex: 2 }}
      >
        <span aria-hidden="true">🌍</span>
      </button>
    </div>,
    document.body,
  );
}
