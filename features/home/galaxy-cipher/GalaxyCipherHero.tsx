"use client";

import { useEffect, useRef, type ReactNode } from "react";

const CYCLE_MS = 180_000;
const ABSORB_AT = [0.035, 0.17, 0.31, 0.45, 0.59, 0.73, 0.86, 0.95];
const TAU = Math.PI * 2;

type Point = { x: number; y: number };
type Target = Point & { glyph: HTMLSpanElement; width: number; height: number };
type Spark = { x: number; y: number; born: number; spin: number; size: number; hue: number };

function glyphs(text: string, region: "title" | "tagline") {
  // Keep word wrapping intact; every visible character still exists in the DOM.
  return text.split(/(\s+)/).map((word, wi) =>
    /^\s+$/.test(word) ? (
      <span key={wi} className="galaxy-cipher-space">{word}</span>
    ) : (
      <span key={wi} className="galaxy-cipher-word">
        {Array.from(word).map((char, ci) => (
          <span key={ci} data-galaxy-glyph={/[A-Za-z0-9]/.test(char) ? region : undefined}
            className="galaxy-cipher-glyph" aria-hidden="true">{char}</span>
        ))}
      </span>
    ),
  );
}

function smoothstep(x: number): number {
  const v = Math.max(0, Math.min(1, x));
  return v * v * (3 - 2 * v);
}

function mix(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function pathAt(points: Point[], times: number[], fraction: number): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  let i = 0;
  while (i < times.length - 2 && fraction >= times[i + 1]) i += 1;
  const t = Math.max(0, Math.min(1,
    (fraction - times[i]) / Math.max(0.001, times[i + 1] - times[i])));
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(points.length - 1, i + 2)];
  // A rounded route, rather than an obvious straight-line journey.
  const catmull = (a: number, b: number, c: number, d: number) =>
    0.5 * ((2 * b) + (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t);
  return { x: catmull(p0.x, p1.x, p2.x, p3.x),
    y: catmull(p0.y, p1.y, p2.y, p3.y) };
}

function drawGalaxy(ctx: CanvasRenderingContext2D, center: Point, radius: number, seconds: number, flash: number) {
  const r = radius;
  const x = center.x;
  const y = center.y;
  ctx.save();

  // Light beyond the glass, with no solid rectangle around the orb.
  const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.9);
  halo.addColorStop(0, "rgba(105,202,255,0.17)");
  halo.addColorStop(0.5, "rgba(65,153,240,0.11)");
  halo.addColorStop(1, "rgba(52,125,235,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.9, 0, TAU);
  ctx.fill();

  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();

  const glass = ctx.createRadialGradient(-r * 0.29, -r * 0.37, r * 0.08, 0, 0, r * 1.18);
  glass.addColorStop(0, "#224a80");
  glass.addColorStop(0.32, "#071b47");
  glass.addColorStop(0.7, "#050c2b");
  glass.addColorStop(1, "#020a14");
  ctx.fillStyle = glass;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Inclined spiral plane; dust arms and stars rotate independently of the orb's path.
  ctx.save();
  ctx.rotate(seconds * 0.065);
  ctx.scale(1, 0.65);
  for (let arm = 0; arm < 3; arm += 1) {
    ctx.beginPath();
    for (let j = 0; j <= 85; j += 1) {
      const u = j / 85;
      const a = arm * TAU / 3 + u * 4.9;
      const radial = (0.1 + u * 0.84) * r;
      if (j === 0) ctx.moveTo(Math.cos(a) * radial, Math.sin(a) * radial);
      else ctx.lineTo(Math.cos(a) * radial, Math.sin(a) * radial);
    }
    ctx.strokeStyle = arm === 0 ? "rgba(145,202,255,0.19)" : "rgba(136,110,245,0.13)";
    ctx.lineWidth = r * 0.2;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Stable, fine-grained particles: deterministic, no flickering random positions.
  for (let i = 0; i < 245; i += 1) {
    const u = (i + 0.5) / 245;
    const arm = i % 3;
    const theta = arm * TAU / 3 + u * 5.8 + Math.sin(i * 78.233) * 0.34;
    const radial = Math.sqrt(u) * r * (0.15 + 0.75 * (0.5 + 0.5 * Math.sin(i * 14.7)));
    const px = Math.cos(theta) * radial;
    const py = Math.sin(theta) * radial;
    const size = (i % 17 === 0 ? 1.15 : 0.44) * Math.max(0.6, r / 20);
    ctx.fillStyle = i % 8 === 0 ? "rgba(233,214,255,0.85)" :
      i % 5 === 0 ? "rgba(153,207,255,0.86)" : "rgba(227,243,255,0.67)";
    ctx.beginPath();
    ctx.arc(px, py, size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  const core = ctx.createRadialGradient(-r * 0.06, -r * 0.07, 0, 0, 0, r * 0.48);
  core.addColorStop(0, "rgba(250,253,255," + (0.94 + flash * 0.06) + ")");
  core.addColorStop(0.18, "rgba(175,226,255,0.93)");
  core.addColorStop(0.48, "rgba(96,169,250,0.28)");
  core.addColorStop(1, "rgba(66,129,238,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, TAU);
  ctx.fill();

  // Specular highlights / rim refraction make this read as glass, not a blue disk.
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.47, r * 0.29, r * 0.115, -0.73, 0, TAU);
  ctx.fillStyle = "rgba(246,254,255,0.45)";
  ctx.fill();
  const shade = ctx.createLinearGradient(-r, -r, r, r);
  shade.addColorStop(0, "rgba(243,253,255,0.73)");
  shade.addColorStop(0.28, "rgba(138,200,252,0.18)");
  shade.addColorStop(0.72, "rgba(67,152,235,0.16)");
  shade.addColorStop(1, "rgba(211,246,255,0.65)");
  ctx.strokeStyle = shade;
  ctx.lineWidth = Math.max(0.9, r * 0.075);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, 0, TAU);
  ctx.stroke();

  ctx.restore();
}

function drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[], orb: Point, now: number, radius: number) {
  for (const p of sparks) {
    const u = Math.max(0, Math.min(1, (now - p.born) / 1350));
    const approach = smoothstep(u);
    const twirl = (1 - u) * radius * 0.9;
    const px = mix(p.x, orb.x, approach) + Math.sin(p.spin + u * 12) * twirl * u;
    const py = mix(p.y, orb.y, approach) + Math.cos(p.spin + u * 12) * twirl * u;
    const alpha = Math.sin(u * Math.PI) * 0.9;
    ctx.fillStyle = p.hue ? "rgba(166,207,255," + alpha + ")" : "rgba(238,251,255," + alpha + ")";
    ctx.beginPath();
    ctx.arc(px, py, p.size * (1 - u * 0.6), 0, TAU);
    ctx.fill();
  }
}

type Props = { title: string; tagline: string; teaser: ReactNode };

export function GalaxyCipherHero({ title, tagline, teaser }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!container || !canvas || !ctx) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let width = 0;
    let height = 0;
    let radius = 18;
    let targets: Target[] = [];
    let points: Point[] = [];
    let pathTimes: number[] = [];
    let fired = new Set<number>();
    let loop = -1;
    let sparks: Spark[] = [];
    let hiddenAt: number | null = null;
    let begin = performance.now();
    let lastFrame = 0;
    const hidden = new Map<HTMLSpanElement, number>();

    const resetGlyphs = () => {
      hidden.forEach((_, glyph) => {
        glyph.classList.remove("galaxy-cipher-glyph--absorbed");
        glyph.style.removeProperty("--galaxy-pull-x");
        glyph.style.removeProperty("--galaxy-pull-y");
      });
      hidden.clear();
    };

    const measure = () => {
      const host = container.getBoundingClientRect();
      width = host.width;
      height = host.height;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(width * ratio);
      canvas.height = Math.ceil(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const heading = container.querySelector("h1");
      const size = heading ? parseFloat(getComputedStyle(heading).fontSize) : 36;
      radius = Math.max(10, Math.min(30, size * 0.39));

      const chars = Array.from(container.querySelectorAll<HTMLSpanElement>("[data-galaxy-glyph]"));
      const titleChars = chars.filter((node) => node.dataset.galaxyGlyph === "title");
      const taglineChars = chars.filter((node) => node.dataset.galaxyGlyph === "tagline");
      const chosen = [
        titleChars[1], taglineChars[8], titleChars[5], taglineChars[2],
        titleChars[8], taglineChars[14], titleChars[3], taglineChars[19],
      ].filter((v): v is HTMLSpanElement => !!v);
      targets = chosen.map((glyph) => {
        const rect = glyph.getBoundingClientRect();
        return { glyph, x: rect.left - host.left + rect.width / 2,
          y: rect.top - host.top + rect.height / 2, width: rect.width, height: rect.height };
      });
      const anchor = targets[0] ?? { x: Math.min(50, width / 2), y: radius + 4 };
      // First and last points coincide: seamless 3-minute loop.
      const start = { x: Math.max(radius * 1.9, anchor.x - radius * 1.5),
        y: Math.max(radius * 1.8, anchor.y - radius * 1.4) };
      points = [start, ...targets.map(({ x, y }) => ({ x, y })), start];
      pathTimes = [0, ...ABSORB_AT.slice(0, targets.length), 1];
      resetGlyphs();
      sparks = [];
      fired = new Set();
      loop = -1;
      begin = performance.now();
    };

    const absorb = (target: Target, now: number, index: number, orb: Point) => {
      const glyph = target.glyph;
      glyph.style.setProperty("--galaxy-pull-x", (orb.x - target.x) * 0.55 + "px");
      glyph.style.setProperty("--galaxy-pull-y", (orb.y - target.y) * 0.55 + "px");
      glyph.classList.add("galaxy-cipher-glyph--absorbed");
      hidden.set(glyph, now + 1780);
      const count = 42;
      for (let i = 0; i < count; i += 1) {
        // Dust emerges from the original letter's silhouette area.
        const a = Math.sin((i + 3 + index * 9) * 53.517) * 43758.5453;
        const b = Math.sin((i + 8 + index * 13) * 24.361) * 17632.428;
        const u = a - Math.floor(a);
        const v = b - Math.floor(b);
        sparks.push({ x: target.x + (u - 0.5) * target.width * 0.84,
          y: target.y + (v - 0.5) * target.height * 0.7,
          born: now - i * 5, spin: i * 2.4, size: i % 7 === 0 ? 1.35 : 0.75,
          hue: i % 3 });
      }
    };

    const tick = (now: number) => {
      frameId = window.requestAnimationFrame(tick);
      if (document.hidden || preference.matches || now - lastFrame < 33) return;
      lastFrame = now;
      if (width <= 0 || points.length < 2) return;
      const elapsed = Math.max(0, now - begin);
      const thisLoop = Math.floor(elapsed / CYCLE_MS);
      if (thisLoop !== loop) {
        loop = thisLoop;
        fired = new Set();
      }
      const phase = (elapsed % CYCLE_MS) / CYCLE_MS;
      const orb = pathAt(points, pathTimes, phase);
      ABSORB_AT.forEach((fraction, index) => {
        if (phase >= fraction && !fired.has(index) && targets[index]) {
          fired.add(index);
          absorb(targets[index], now, index, orb);
        }
      });
      for (const [glyph, until] of hidden) {
        if (now >= until) {
          glyph.classList.remove("galaxy-cipher-glyph--absorbed");
          hidden.delete(glyph);
        }
      }
      sparks = sparks.filter((spark) => now - spark.born < 1350);
      ctx.clearRect(0, 0, width, height);
      drawSparks(ctx, sparks, orb, now, radius);
      const flash = sparks.length > 0 ? 1 : 0;
      drawGalaxy(ctx, orb, radius, now / 1000, flash);
    };

    const onVisibility = () => {
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt !== null) {
        begin += performance.now() - hiddenAt;
        hiddenAt = null;
      }
    };
    const onPreference = () => {
      if (preference.matches) {
        cancelAnimationFrame(frameId);
        frameId = 0;
        ctx.clearRect(0, 0, width, height);
        resetGlyphs();
      } else {
        measure();
        if (!frameId) frameId = requestAnimationFrame(tick);
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", onVisibility);
    preference.addEventListener("change", onPreference);
    measure();
    if (!preference.matches) frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      preference.removeEventListener("change", onPreference);
      resetGlyphs();
    };
  }, [title, tagline]);

  return (
    <div ref={containerRef} className="galaxy-cipher-field">
      <div className="flex items-start gap-4 sm:gap-5">
        <h1 aria-label={title} className="galaxy-cipher-title min-w-0 flex-1 text-[clamp(1.75rem,6.2vw,4.25rem)] font-medium leading-[1.15] tracking-[0.04em] text-[var(--foreground)]">
          {glyphs(title, "title")}
        </h1>
        {teaser}
      </div>
      <p aria-label={tagline} className="galaxy-cipher-tagline mt-5 max-w-xl text-[1.05rem] leading-relaxed tracking-[0.02em] text-[var(--foreground-muted)] sm:mt-9 sm:text-lg sm:leading-8">
        {glyphs(tagline, "tagline")}
      </p>
      <canvas ref={canvasRef} className="galaxy-cipher-canvas" aria-hidden="true" />
    </div>
  );
}
