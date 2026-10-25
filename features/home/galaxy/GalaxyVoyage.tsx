"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GALAXY } from "./GalaxyHeading";
import { drawStage1EntryCraft } from "./drawStage1EntryCraft";
import { createGalaxyFlightScene } from "./GalaxyFlightScene";

type Point = { x: number; y: number };
type Star = { x: number; y: number; r: number; alpha: number; speed: number; phase: number; hue: number };
type Dust = { x: number; y: number; t: number; speed: number; drift: number };

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => { const v = clamp(t, 0, 1); return v * v * (3 - 2 * v); };
const NASA_M100 = "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia15/pia15910/PIA15910.jpg?fit=clip&w=1200";
const FIRST_STAR_STEP = 30;
const FIRST_PLANET_STEP = 31;
const FINAL_STEP = 235;
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
  const spacecraftIconRef = useRef<HTMLCanvasElement>(null);
  const exitRef = useRef(onExit);
  const advanceRef = useRef<() => void>(() => {});
  exitRef.current = onExit;

  useEffect(() => {
    // This is the ORIGINAL Stage 1 atmosphere-entry spaceship, NOT the
    // squid's later ocean escape skiff. Pure hull, heat and plasma disabled.
    const iconCanvas = spacecraftIconRef.current;
    const g = iconCanvas?.getContext("2d");
    if (!iconCanvas || !g) return;
    const dpi = Math.min(2.5, window.devicePixelRatio || 1);
    iconCanvas.width = Math.round(68 * dpi);
    iconCanvas.height = Math.round(54 * dpi);
    g.setTransform(dpi, 0, 0, dpi, 0, 0);
    g.clearRect(0, 0, 68, 54);
    drawStage1EntryCraft(g, 30, 27, -0.15, 48, 1, 0, false, 0);
  }, []);

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
    // Start both galaxies face-on. Independent rotations are accumulated
    // only while they are visibly large enough to appreciate the tumbling.
    let firstRotation = 0.08;
    let nextRotation = 0.16;
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
    const prepared = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
    const selectedText = sampleTextLocations();
    // The real homepage is hidden during the trip, so the DOM may no longer
    // have measurable glyph pixels. Supply guaranteed points from the on-screen
    // MIAV lettering: visible separate sand grains, not streaks or scratches.
    const titleGrains: Point[] = Array.from({ length: 190 }, (_, i) => ({
      x: viewWidth * (0.29 + ((i * 73) % 190) / 190 * 0.42),
      y: viewHeight * (viewWidth < 680 ? 0.24 : 0.23)
        + (((i * 47) % 29) - 14) * Math.min(1.5, viewWidth / 700),
    }));
    const dust: Dust[] = [...titleGrains, ...selectedText.slice(0, 110)].map((p) => ({
      ...p, t: -Math.random() * 0.30, speed: 0.75 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 44,
    }));
    const flightScene = createGalaxyFlightScene();

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
      if (titleGhost) return titleGhost;
      // Draw independently of the hidden homepage layout. The title must
      // remain readable on desktop AND on a narrow Android screen.
      const size = Math.min(57, Math.max(23, viewWidth * 0.055));
      const w = Math.ceil(Math.min(850, viewWidth * 0.88));
      const h = Math.ceil(size * 1.45);
      const output = document.createElement("canvas");
      output.width = w;
      output.height = h;
      const g = output.getContext("2d");
      if (!g) return null;
      g.font = "500 " + size + "px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#f5f6ff";
      g.fillText("MIAV-922228", w * 0.5, h * 0.52, w * 0.95);
      // Actually subtract small ragged holes from the glyph pixels.
      g.globalCompositeOperation = "destination-out";
      let seed = 194822;
      const next = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 490; i++) {
        const x = next() * w;
        const y = next() * h;
        const size = 0.6 + next() * (i % 9 === 0 ? 4.2 : 2.5);
        g.fillStyle = "rgba(0,0,0," + (0.48 + next() * 0.52) + ")";
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
      const cx = mix(origin.x, viewWidth * 0.51, p);
      const cy = mix(origin.y, viewHeight * 0.52, p);
      const short = Math.min(viewWidth, viewHeight);
      ctx!.fillStyle = "rgba(0,2,9," + ease((p - 0.14) / 0.55) + ")";
      ctx!.fillRect(0, 0, viewWidth, viewHeight);
      // The sphere NEVER implodes or cracks. Its shell stays in place,
      // becoming transparent as the galaxy itself fills the scene.
      if (p < 0.99) {
        ctx!.save();
        ctx!.globalAlpha = 1 - ease((p - 0.05) / 0.9);
        drawGlass(cx, cy, origin.radius * (1 + 0.04 * p), now);
        ctx!.restore();
      }
      galaxyImage(first.complete && first.naturalWidth ? first : globe,
        cx, cy, mix(origin.radius * 1.52, short * 0.66, p),
        firstRotation, ease((p - 0.02) / 0.8));
      // An occasional sand grain spirals into the galactic disk while
      // the original page gently disappears below the dark viewport.
      drawSand(now, cx, cy, ease((p - 0.22) / 0.7) * 0.56);
    }

    function drawVoyageTitle(now: number, s: number) {
      // First tap after the glass fades: strong WHITE letters.
      // Next tap: visibly perforated/fading letters. Next: they are gone.
      const strength = 1 - ease((s - 0.08) / 1.93);
      if (strength < 0.003) return;
      const mask = damagedTitle();
      const x = viewWidth * 0.5;
      const y = viewHeight * (viewWidth < 680 ? 0.24 : 0.23);
      ctx!.save();
      ctx!.globalAlpha = strength;
      if (s < 0.48) {
        const fontSize = Math.min(57, Math.max(23, viewWidth * 0.055));
        ctx!.font = "500 " + fontSize + "px Georgia, serif";
        ctx!.textBaseline = "middle";
        ctx!.textAlign = "center";
        ctx!.fillStyle = "rgba(248,249,255,.97)";
        ctx!.fillText("MIAV-922228", x, y);
      } else if (mask) {
        const size = Math.min(mask.width, viewWidth * 0.84);
        const height = size * mask.height / mask.width;
        ctx!.drawImage(mask, x - size / 2, y - height / 2, size, height);
      }
      ctx!.restore();
    }

    function drawGalaxy3D(img: HTMLImageElement, x: number, y: number, diameter: number,
      phase: number, alpha: number, depth = 1) {
      if (diameter < 1 || alpha <= 0.002) return;
      const texture = preparedGalaxy(img);
      if (!texture) return;
      // Orthographic projection of a real disk using three independent axes.
      // Yaw and pitch each complete full circles; roll is independent too.
      // The halo and central bulge retain thickness in edge-on views.
      const yaw = phase * 0.96 + Math.sin(phase * 0.49 + depth) * 0.22;
      const pitch = phase * 0.70 + Math.sin(phase * 0.61 + depth) * 0.30;
      const roll = phase * 1.23;
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const cr = Math.cos(roll), sr = Math.sin(roll);
      const a = cr * cy - sr * sp * sy;
      const b = sr * cy + cr * sp * sy;
      const c = -sr * cp;
      const d = cr * cp;
      const face = Math.abs(cy * cp);
      const edge = 1 - face;
      const direction = 0.5 * Math.atan2(2 * (a * b + c * d), a * a + c * c - b * b - d * d);
      const radius = diameter * 0.5;
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.globalAlpha = clamp(alpha, 0, 1);
      if (edge > 0.05 && radius > 3) {
        ctx!.save();
        ctx!.rotate(direction);
        ctx!.scale(1, 0.31);
        const disk = ctx!.createRadialGradient(0, 0, 0, 0, 0, radius * 0.90);
        disk.addColorStop(0, "rgba(241,194,249," + (edge * 0.65) + ")");
        disk.addColorStop(0.26, "rgba(149,129,226," + (edge * 0.46) + ")");
        disk.addColorStop(1, "rgba(67,94,177,0)");
        ctx!.fillStyle = disk;
        ctx!.beginPath(); ctx!.arc(0, 0, radius * 0.90, 0, TAU); ctx!.fill();
        ctx!.restore();
        // The nucleus is a modest three-dimensional bulge, never a flat line.
        ctx!.save();
        ctx!.rotate(direction);
        ctx!.scale(1, 0.56);
        const nucleus = ctx!.createRadialGradient(0, 0, 0, 0, 0, radius * 0.28);
        nucleus.addColorStop(0, "rgba(252,224,247," + (edge * 0.72) + ")");
        nucleus.addColorStop(0.45, "rgba(178,141,227," + (edge * 0.44) + ")");
        nucleus.addColorStop(1, "rgba(94,83,158,0)");
        ctx!.fillStyle = nucleus;
        ctx!.beginPath(); ctx!.arc(0, 0, radius * 0.28, 0, TAU); ctx!.fill();
        ctx!.restore();
      }
      ctx!.save();
      ctx!.transform(a, b, c, d, 0, 0);
      ctx!.globalCompositeOperation = "screen";
      ctx!.drawImage(texture, -radius, -radius, diameter, diameter);
      ctx!.restore();
      ctx!.restore();
    }


    function draw(now: number, dt: number) {
      if (!running) return;
      ctx!.clearRect(0, 0, viewWidth, viewHeight);
      const age = now - opened;
      const short = Math.min(viewWidth, viewHeight);
      // Only the glass absorption runs automatically after the first click.
      if (age < IMPLOSION_MS) { drawImplosion(now); return; }
      progress = mix(progress, target, reduced ? 1 : Math.min(1, dt / 205));
      if (Math.abs(progress - target) < 0.005) progress = target;
      const s = progress;
      ctx!.fillStyle = "#01040c";
      ctx!.fillRect(0, 0, viewWidth, viewHeight);
      // Begin on nearly empty black with the original galaxy and title.
      // Tap 2/3/5 reveal 10/30/100 real distant star points. By the time
      // the galaxy is tiny a complete starfield fills the window; planets
      // have their own perspective before any final spiral can be recognised.
      flightScene.drawSky(ctx!, now, viewWidth, viewHeight, s);
      // Only diffuse haze supplements those same sky stars; no new photo or
      // rectangle of particles pops into existence.
      flightScene.drawGalaxy(ctx!, s, viewWidth, viewHeight);

      // 0–2: thin, eroded MIAV title with sand leaving it.
      // 3–30: the first 3D rotating galaxy recedes to one star FIRST.
      const recession = Math.max(0, s - 3);
      const firstSize = short * 0.66 * Math.pow(0.78, Math.min(FIRST_STAR_STEP - 3, recession));
      if (!reduced && firstSize > short * 0.10) firstRotation += dt * 0.000175;
      if (s < FIRST_PLANET_STEP) {
        drawGalaxy3D(first.complete && first.naturalWidth ? first : globe,
          viewWidth * 0.51, viewHeight * 0.52, firstSize, firstRotation,
          1 - ease((s - FIRST_STAR_STEP + 2) / 5), 0.2);
      } else if (s < 112) {
        ctx!.fillStyle = "rgba(235,209,255,0.42)";
        ctx!.beginPath();
        ctx!.arc(viewWidth * 0.51, viewHeight * 0.52, 0.7, 0, TAU);
        ctx!.fill();
      }

      if (s < 2.02) {
        drawVoyageTitle(now, s);
        drawSand(now, viewWidth * 0.51, viewHeight * 0.52,
          0.96 * (1 - ease((s - 0.85) / 1.13)));
      }

      // Off-axis planets are fixed behind the ship. The rear-facing camera
      // makes them slide inward from the window edge as they grow more distant.
      flightScene.drawForeground(ctx!, s, viewWidth, viewHeight);
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
      if (event.key === "Escape") {
        event.preventDefault();
        exitRef.current();
        return;
      }
      // Activating the dedicated return-home ship must never also advance the
      // galaxy camera, and form / link keyboard input keeps working.
      const element = event.target;
      if (element instanceof Element && element.closest("button, a, input, textarea, select")) return;
      if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        stepForward();
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
        aria-label="Return to MIAV home using the Stage 1 atmosphere-entry spaceship"
        title="Return home"
        onClick={(event) => { event.stopPropagation(); onExit(); }}
        className="absolute left-3 top-3 flex h-14 w-[4.5rem] items-center justify-center rounded-full border border-white/20 bg-[#071426]/75 shadow-[0_0_12px_rgba(65,150,240,0.12)] backdrop-blur-sm hover:border-sky-200/55 hover:bg-[#102944] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        style={{ zIndex: 2 }}
      >
        <canvas
          ref={spacecraftIconRef}
          aria-hidden="true"
          className="pointer-events-none h-[3.375rem] w-[4.25rem]"
        />
      </button>
    </div>,
    document.body,
  );
}
