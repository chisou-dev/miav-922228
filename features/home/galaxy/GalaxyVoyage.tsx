"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GALAXY } from "./GalaxyHeading";

type Point = { x: number; y: number };
type Star = { x: number; y: number; r: number; alpha: number; speed: number; phase: number; hue: number };
type Dust = { x: number; y: number; t: number; speed: number; drift: number };
type Planet = { enter: number; leave: number; scale: number; y: number; hue: number; ring: boolean; reverse: boolean };

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => { const v = clamp(t, 0, 1); return v * v * (3 - 2 * v); };
const NASA_M100 = "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia15/pia15910/PIA15910.jpg?fit=clip&w=1200";
// The real Andromeda galaxy (M31), GALEX observation PIA15416.
// Source: https://science.nasa.gov/photojournal/andromeda/
const NASA_ANDROMEDA = "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia15/pia15416/PIA15416.jpg?fit=clip&w=1400";
const FINAL_STEP = 76;
const IMPLOSION_MS = 1650;
const FINAL_HOLD_MS = 30_000;
const IDLE_MS = 120_000;

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
    let titleGhost: HTMLCanvasElement | null = null;
    const titleRect = document.querySelector("[data-galaxy-title]")?.getBoundingClientRect() ?? null;
    let lastAdvanceAt = 0;

    // The NASA images really are telescope observations. They are composited
    // as an artistic journey, not as an accurate atlas of galaxy positions.
    const globe = new Image();
    globe.src = GALAXY;
    const first = new Image();
    first.src = NASA_M100;
    const second = new Image();
    second.onerror = () => {
      // Backup is the original NASA/JPL Photojournal JPEG. No loop on failure.
      second.onerror = null;
      second.src = "https://photojournal.jpl.nasa.gov/jpeg/PIA15416.jpg";
    };
    second.src = NASA_ANDROMEDA;
    const prepared = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
    const selectedText = sampleTextLocations();
    const dust: Dust[] = selectedText.slice(0, 300).map((p) => ({
      ...p, t: -Math.random() * 0.30, speed: 0.75 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 44,
    }));
    // These foreground planets are imaginary visual elements, not
    // detections of planets in M31. Overlapping passes create parallax.
    const planets: Planet[] = [
      { enter: 11, leave: 20, scale: 0.23, y: 0.64, hue: 204, ring: false, reverse: false },
      { enter: 19, leave: 29, scale: 0.13, y: 0.27, hue: 36, ring: true, reverse: true },
      { enter: 27, leave: 38, scale: 0.17, y: 0.70, hue: 268, ring: false, reverse: false },
      { enter: 41, leave: 51, scale: 0.12, y: 0.36, hue: 184, ring: false, reverse: true },
      { enter: 53, leave: 65, scale: 0.19, y: 0.73, hue: 23, ring: true, reverse: false },
      { enter: 61, leave: 71, scale: 0.10, y: 0.25, hue: 225, ring: false, reverse: true },
    ];
    const stars: (Star & { reveal: number })[] = Array.from({ length: 650 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.35 + Math.random() * 1.24,
      alpha: 0.22 + Math.random() * 0.70,
      speed: 0.00043 + Math.random() * 0.0017,
      phase: Math.random() * TAU,
      hue: [0, 12, 30, 46, 190, 205, 225, 268][Math.floor(Math.random() * 8)],
      reveal: Math.random(),
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

    function starscape(now: number, density: number, final: boolean) {
      const amount = clamp(density, 0, 1);
      for (const star of stars) {
        if (star.reveal > amount) continue;
        const x = star.x * viewWidth;
        const y = star.y * viewHeight;
        const shimmer = 0.66 + 0.34 * Math.sin(now * star.speed + star.phase);
        const a = Math.min(1, star.alpha * shimmer * (final ? 1 : 0.63));
        ctx!.fillStyle = "hsla(" + star.hue + ",78%," +
          (star.hue === 225 ? 88 : 82) + "%," + a.toFixed(3) + ")";
        ctx!.beginPath();
        ctx!.arc(x, y, star.r * (final ? 1 : 0.72), 0, TAU);
        ctx!.fill();
        if (final && star.r > 1.22 && a > 0.48) {
          ctx!.strokeStyle = "hsla(" + star.hue + ",75%,89%," + (a * 0.21).toFixed(3) + ")";
          ctx!.lineWidth = 0.50;
          ctx!.beginPath();
          ctx!.moveTo(x - star.r * 2.1, y);
          ctx!.lineTo(x + star.r * 2.1, y);
          ctx!.moveTo(x, y - star.r * 2.1);
          ctx!.lineTo(x, y + star.r * 2.1);
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


    function damagedTitle() {
      if (titleGhost || !titleRect) return titleGhost;
      const element = document.querySelector<HTMLElement>("[data-galaxy-title]");
      if (!element) return null;
      const style = getComputedStyle(element);
      const w = Math.ceil(Math.min(1200, Math.max(100, titleRect.width)));
      const h = Math.ceil(Math.max(28, titleRect.height));
      const output = document.createElement("canvas");
      output.width = w;
      output.height = h;
      const g = output.getContext("2d");
      if (!g) return null;
      g.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
      g.textBaseline = "middle";
      g.fillStyle = "#f4f6ff";
      g.fillText((element.textContent || "MIAV-922228").trim(), 0, h * 0.52, w);
      // Literal perforations in the letters, not scratches in outer space.
      g.globalCompositeOperation = "destination-out";
      let seed = 194822;
      const next = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 470; i++) {
        const x = next() * w;
        const y = next() * h;
        const size = 0.42 + next() * (i % 9 === 0 ? 4.2 : 2.2);
        g.fillStyle = "rgba(0,0,0," + (0.45 + next() * 0.55) + ")";
        g.beginPath();
        g.arc(x, y, size, 0, TAU);
        g.fill();
      }
      g.globalCompositeOperation = "source-over";
      titleGhost = output;
      return output;
    }

    function drawErodedTitle(now: number, strength: number) {
      if (strength < 0.001 || !titleRect) return;
      const mask = damagedTitle();
      if (!mask) return;
      ctx!.save();
      ctx!.globalAlpha = strength * (0.87 + 0.13 * Math.sin(now * 0.0019));
      ctx!.drawImage(mask, titleRect.left, titleRect.top, titleRect.width, titleRect.height);
      ctx!.restore();
    }

    function drawSand(now: number, cx: number, cy: number, amount: number) {
      if (amount <= 0) return;
      // An independent pinhead of sand follows a bent path to the wandering
      // galaxy, with individual delay. Never draw straight white streaks.
      const tNow = (now - opened) / 3400;
      for (const grain of dust) {
        const travel = ((tNow * grain.speed - grain.t + 3.0) % 1);
        const t = ease(travel);
        const arc = Math.sin(Math.PI * travel);
        const dx = cx - grain.x;
        const dy = cy - grain.y;
        const swirlX = Math.cos(t * TAU * 1.25 + grain.drift) * arc * 18;
        const swirlY = Math.sin(t * TAU * 1.25 + grain.drift) * arc * 11;
        const x = grain.x + dx * t + swirlX;
        const y = grain.y + dy * t + swirlY;
        const fade = Math.sin(Math.PI * travel) * amount;
        const radius = (0.50 + Math.abs(grain.drift / 44) * 0.9) * (1 - 0.45 * t);
        ctx!.fillStyle = "rgba(239,230,213," + (fade * 0.74).toFixed(3) + ")";
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, TAU);
        ctx!.fill();
      }
    }

    function drawImplosion(now: number) {
      const age = now - opened;
      const p = reduced ? 1 : ease(age / IMPLOSION_MS);
      const cx = mix(origin.x, viewWidth * 0.55, p);
      const cy = mix(origin.y, viewHeight * 0.52, p);
      const short = Math.min(viewWidth, viewHeight);
      const dark = ease((p - 0.23) / 0.57);
      ctx!.fillStyle = "rgba(0,2,9," + dark + ")";
      ctx!.fillRect(0, 0, viewWidth, viewHeight);
      // Glass contracts, and its galaxy expands, pulling the sphere inward.
      // There are no fracture lines, shards or polygon fragments.
      const shellRadius = origin.radius * (1 - 0.97 * ease(p / 0.8));
      if (shellRadius > 1.5 && p < 0.86) {
        ctx!.save();
        ctx!.globalAlpha = 1 - ease((p - 0.31) / 0.52);
        drawGlass(origin.x, origin.y, shellRadius, now);
        ctx!.restore();
      }
      galaxyImage(first.complete && first.naturalWidth ? first : globe,
        cx, cy, mix(origin.radius * 1.55, short * 0.57, p),
        firstRotation, ease((p - 0.05) / 0.55));
      drawSand(now, cx, cy, ease(p / 0.7));
      drawErodedTitle(now, ease((p - 0.62) / 0.35) * 0.37);
    }

    function drawPlanet(planet: Planet, step: number) {
      if (step < planet.enter || step >= planet.leave) return;
      const t = clamp((step - planet.enter) / (planet.leave - planet.enter), 0, 1);
      const pass = Math.pow(Math.sin(Math.PI * t), 1.2);
      const short = Math.min(viewWidth, viewHeight);
      const r = short * (0.005 + planet.scale * pass);
      const x = (planet.reverse ? mix(-0.20, 1.18, t) : mix(1.18, -0.20, t)) * viewWidth;
      const y = (planet.y + (t - 0.5) * (planet.reverse ? 0.15 : -0.15)) * viewHeight;
      if (r < 1) return;
      ctx!.save();
      ctx!.translate(x, y);
      const light = ctx!.createRadialGradient(-r * 0.33, -r * 0.4, r * 0.025, r * 0.23, r * 0.13, r * 1.17);
      light.addColorStop(0, "hsla(" + planet.hue + ",55%,83%,0.99)");
      light.addColorStop(0.38, "hsla(" + planet.hue + ",55%,48%,0.98)");
      light.addColorStop(0.74, "hsla(" + (planet.hue + 8) + ",65%,19%,0.99)");
      light.addColorStop(1, "rgba(2,5,15,1)");
      ctx!.fillStyle = light;
      ctx!.beginPath();
      ctx!.arc(0, 0, r, 0, TAU);
      ctx!.fill();
      ctx!.save();
      ctx!.clip();
      ctx!.strokeStyle = "hsla(" + (planet.hue + 18) + ",42%,82%,0.12)";
      ctx!.lineWidth = Math.max(0.5, r * 0.055);
      for (let band = -3; band <= 3; band++) {
        ctx!.beginPath();
        ctx!.ellipse(r * 0.07, band * r * 0.24, r * 1.1, r * 0.23, -0.27, 0, TAU);
        ctx!.stroke();
      }
      ctx!.restore();
      if (planet.ring && r > 8) {
        ctx!.strokeStyle = "hsla(" + (planet.hue + 33) + ",37%,85%," + (0.31 * pass).toFixed(3) + ")";
        ctx!.lineWidth = Math.max(0.8, r * 0.11);
        ctx!.beginPath();
        ctx!.ellipse(0, 0, r * 1.67, r * 0.38, -0.24, Math.PI * 0.07, Math.PI * 0.95);
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function draw(now: number, dt: number) {
      if (!running) return;
      ctx!.clearRect(0, 0, viewWidth, viewHeight);
      const age = now - opened;
      const short = Math.min(viewWidth, viewHeight);

      // Only the implosion animates on its own. All subsequent scene changes
      // require an explicit click / tap / keyboard activation.
      if (age < IMPLOSION_MS) {
        drawImplosion(now);
        return;
      }

      progress = mix(progress, target, reduced ? 1 : Math.min(1, dt / 180));
      if (Math.abs(progress - target) < 0.005) progress = target;
      const s = progress;
      ctx!.fillStyle = "#01040c";
      ctx!.fillRect(0, 0, viewWidth, viewHeight);

      // Stage 0–1: a quiet wandering galaxy drinks individual specks of
      // sand from the home text. The DOM behind the overlay is not modified.
      if (s < 2.75) {
        const wanderX = reduced ? 0 : Math.sin(now * 0.00031) * short * 0.027 +
          Math.cos(now * 0.00018) * short * 0.016;
        const wanderY = reduced ? 0 : Math.cos(now * 0.00029) * short * 0.024;
        const gx = viewWidth * 0.55 + wanderX;
        const gy = viewHeight * 0.52 + wanderY;
        if (!reduced) firstRotation += dt * 0.000055;
        galaxyImage(first.complete && first.naturalWidth ? first : globe,
          gx, gy, short * mix(0.57, 0.67, ease(s / 2)),
          firstRotation, 1 - ease((s - 2.0) / 0.75));
        const titleOpacity = (s <= 1 ? mix(0.35, 0.17, ease(s)) : 0.17 * (1 - ease(s - 1)));
        drawErodedTitle(now, titleOpacity);
        drawSand(now, gx, gy, 1 - ease((s - 1.6) / 1.15));
        if (s < 2.04) return;
      }

      // Step 2: the title has vanished from the *overlay*, revealing a single
      // intact spiral. Steps 3–25 then pull the camera away from the galaxy.
      const recession = Math.max(0, s - 2);
      const firstSize = short * 0.70 * Math.pow(0.79, Math.min(24, recession));
      if (firstSize > short * 0.15 && !reduced) {
        firstRotation += dt * 0.000050;
      }
      const p1 = ease(clamp(recession / 24, 0, 1));
      const firstX = mix(viewWidth * 0.55, viewWidth * 0.29, p1);
      const firstY = mix(viewHeight * 0.52, viewHeight * 0.32, p1);
      const firstFade = 1 - ease((s - 46) / 10);
      galaxyImage(first.complete && first.naturalWidth ? first : globe,
        firstX, firstY, firstSize, firstRotation, firstFade);

      // Stars arrive gradually, tied to distance rather than to elapsed time.
      // Passing planets are fictionally illustrated foreground objects.
      const starsAdded = clamp(ease((s - 3) / 69), 0, 1);
      starscape(now, 0.018 + starsAdded * 0.982, s >= FINAL_STEP - 1);

      // Move through the outskirts of the first galaxy. Each planet moves
      // laterally across the frame, gets larger near closest approach, then
      // shrinks behind the viewer, conveying real parallax in the illustration.
      for (const planet of planets) drawPlanet(planet, s);

      // Andromeda appears far to the lower right as a tiny point. The camera
      // follows a curved flyby through its outer edge, rather than making a
      // nearby photograph suddenly bloom at a fixed spot.
      if (s >= 31) {
        const incoming = ease(clamp((s - 31) / 24, 0, 1));
        const outgoing = ease(clamp((s - 55) / 20, 0, 1));
        const approachSize = short * 0.004 * Math.pow(0.54 / 0.004, incoming);
        const secondSize = approachSize * Math.pow(0.76, Math.max(0, s - 55));
        const andromedaX =
          mix(viewWidth * 0.92, viewWidth * 0.57, incoming) -
          outgoing * viewWidth * 0.63;
        const andromedaY =
          mix(viewHeight * 0.64, viewHeight * 0.51, incoming) -
          outgoing * viewHeight * 0.24;
        if (secondSize > short * 0.16 && !reduced) {
          nextRotation += dt * 0.000041;
        }
        const fade = 1 - ease((s - 71) / 5);
        galaxyImage(second, andromedaX, andromedaY,
          secondSize, nextRotation, fade);
      }
      // The ending is only gently multicoloured points of light, never the
      // previous NASA deep-field photograph or a pasted star-background plate.
    }

    function stepForward() {
      const now = performance.now();
      if (now - lastAdvanceAt < 120 || now - opened < IMPLOSION_MS - 80) return;
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
