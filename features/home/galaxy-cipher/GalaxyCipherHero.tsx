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


type Quat = { w: number; x: number; y: number; z: number };
type GalaxyStar = { x: number; y: number; z: number; alpha: number; size: number; color: number };
const INITIAL_ATTITUDE: Quat = { w: 0.983, x: 0.15, y: 0.11, z: 0.02 };

// Spiral arms built once: uneven densities, a central bulge and wispy dust lanes.
// All stars are projected through the same quaternion, making the disk turn edge-on.
const GALAXY_STARS: GalaxyStar[] = (() => {
  const result: GalaxyStar[] = [];
  const rand = (n: number) => {
    const v = Math.sin(n * 127.1 + 74.7) * 43758.5453123;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 950; i += 1) {
    const arm = i % 2;
    const r = 0.07 + Math.pow(rand(i + 19), 0.83) * 0.83;
    const armAngle = arm * Math.PI + 5.25 * r + (rand(i * 4 + 15) - 0.5) * (0.21 + r * 0.65);
    const offset = (rand(i * 7 + 26) - 0.5) * 0.08;
    result.push({
      x: Math.cos(armAngle) * r + offset, y: Math.sin(armAngle) * r + offset,
      z: (rand(i * 5 + 41) - 0.5) * (0.055 + (1 - r) * 0.075),
      alpha: 0.26 + rand(i * 3 + 33) * 0.73,
      size: i % 29 === 0 ? 1.4 : i % 9 === 0 ? 0.95 : 0.43,
      color: i % 15 === 0 ? 2 : i % 7 === 0 ? 1 : 0,
    });
  }
  for (let i = 0; i < 185; i += 1) {
    const r = Math.pow(rand(i + 1101), 1.8) * 0.38;
    const a = rand(i + 1320) * TAU;
    result.push({
      x: r * Math.cos(a), y: r * Math.sin(a),
      z: (rand(i * 7 + 1440) - 0.5) * (0.25 - r * 0.3),
      alpha: 0.36 + rand(i * 2 + 1520) * 0.53,
      size: i % 13 === 0 ? 1.1 : 0.48,
      color: i % 6 === 0 ? 2 : 0,
    });
  }
  return result;
})();

function multiplyQuat(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function normalizeQuat(q: Quat): Quat {
  const length = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  return { w: q.w / length, x: q.x / length, y: q.y / length, z: q.z / length };
}

function rotate3(q: Quat, x: number, y: number, z: number): [number, number, number] {
  const tx = 2 * (q.y * z - q.z * y);
  const ty = 2 * (q.z * x - q.x * z);
  const tz = 2 * (q.x * y - q.y * x);
  return [x + q.w * tx + (q.y * tz - q.z * ty),
    y + q.w * ty + (q.z * tx - q.x * tz),
    z + q.w * tz + (q.x * ty - q.y * tx)];
}

function rollGalaxy(q: Quat, dx: number, dy: number, radius: number): Quat {
  const distance = Math.hypot(dx, dy);
  if (distance < 0.001) return q;
  const angle = Math.min(0.10, distance / Math.max(12, radius) * 0.95);
  const h = angle / 2;
  const s = Math.sin(h) / distance;
  // Sphere rolling without sliding: screen-plane travel produces 3D rotation.
  return normalizeQuat(multiplyQuat({ w: Math.cos(h), x: dy * s, y: -dx * s, z: 0 }, q));
}

function drawGalaxy(
  ctx: CanvasRenderingContext2D, center: Point, radius: number,
  attitude: Quat, seconds: number, flash: number,
) {
  const r = radius;
  const x = center.x;
  const y = center.y;
  ctx.save();

  const halo = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2);
  halo.addColorStop(0, "rgba(135,212,255,0.20)");
  halo.addColorStop(0.38, "rgba(70,154,251,0.13)");
  halo.addColorStop(1, "rgba(70,154,251,0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();

  ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();

  // A transparent sphere with deep-space material, not a decorative flat icon.
  const glass = ctx.createRadialGradient(-r * 0.34, -r * 0.35, r * 0.06, 0, 0, r * 1.04);
  glass.addColorStop(0, "#173257");
  glass.addColorStop(0.45, "#030e25");
  glass.addColorStop(0.86, "#020713");
  glass.addColorStop(1, "#05172b");
  ctx.fillStyle = glass; ctx.fillRect(-r, -r, r * 2, r * 2);

  // Slow spin about the galaxy's OWN normal, independent of rolling attitude.
  const spin = seconds * 0.055;
  const q = multiplyQuat(attitude, { w: Math.cos(spin / 2), x: 0, y: 0, z: Math.sin(spin / 2) });

  // Two broad, uneven photo-like nebulous spiral arms. Project every point
  // individually; when edge-on this naturally collapses to a thin streak.
  ctx.globalCompositeOperation = "screen";
  for (let arm = 0; arm < 2; arm += 1) {
    for (let stripe = -2; stripe <= 2; stripe += 1) {
      ctx.beginPath();
      for (let j = 0; j <= 72; j += 1) {
        const t = j / 72;
        const radial = 0.12 + t * 0.72;
        const angle = arm * Math.PI + 5.25 * radial + stripe * 0.052;
        const [px, py] = rotate3(q, Math.cos(angle) * radial, Math.sin(angle) * radial, 0);
        if (j === 0) ctx.moveTo(px * r * 0.91, py * r * 0.91);
        else ctx.lineTo(px * r * 0.91, py * r * 0.91);
      }
      const alpha = stripe === 0 ? 0.23 : stripe === -1 || stripe === 1 ? 0.12 : 0.065;
      ctx.strokeStyle = arm === 0
        ? "rgba(104,182,252," + alpha + ")"
        : "rgba(173,151,255," + alpha + ")";
      ctx.lineWidth = Math.max(1.4, r * 0.11);
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  // Stars live inside the disk and bulge; all share the same 3D attitude.
  // A few separate larger bright points prevent the galaxy reading as paint.
  for (const star of GALAXY_STARS) {
    const [sx, sy, sz] = rotate3(q, star.x, star.y, star.z);
    const depth = 1 + sz * 0.13;
    const px = sx * r * 0.94;
    const py = sy * r * 0.94;
    const rr = Math.max(0.3, star.size * (r / 38) * depth);
    const alpha = Math.max(0.1, Math.min(0.96, star.alpha * (0.8 + sz * 0.22)));
    ctx.fillStyle = star.color === 2
      ? "rgba(250,226,236," + alpha + ")"
      : star.color === 1
        ? "rgba(160,188,255," + alpha + ")"
        : "rgba(224,244,255," + alpha + ")";
    ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  const nucleus = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.32);
  nucleus.addColorStop(0, "rgba(250,253,255," + (0.92 + flash * 0.07) + ")");
  nucleus.addColorStop(0.14, "rgba(219,244,255,0.9)");
  nucleus.addColorStop(0.44, "rgba(135,208,255,0.42)");
  nucleus.addColorStop(1, "rgba(95,147,246,0)");
  ctx.fillStyle = nucleus;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, TAU); ctx.fill();

  // Subtle glass lens: keep the silhouette of the disk readable.
  const rim = ctx.createLinearGradient(-r, -r, r, r);
  rim.addColorStop(0, "rgba(232,250,255,0.88)");
  rim.addColorStop(0.3, "rgba(112,199,255,0.14)");
  rim.addColorStop(0.68, "rgba(53,128,255,0.18)");
  rim.addColorStop(1, "rgba(229,249,255,0.71)");
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1.1, r * 0.055);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.955, 0, TAU); ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-r * 0.41, -r * 0.53, r * 0.25, r * 0.078, -0.69, 0, TAU);
  ctx.fillStyle = "rgba(251,254,255,0.32)"; ctx.fill();
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
    let radius = 24;
    let attitude: Quat = { ...INITIAL_ATTITUDE };
    let lastOrb: Point | null = null;
    let influenced = new Set<HTMLSpanElement>();
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
      for (const node of influenced) {
        node.classList.remove("galaxy-cipher-glyph--gravity");
        node.style.removeProperty("--galaxy-gravity-x");
        node.style.removeProperty("--galaxy-gravity-y");
      }
      influenced.clear();
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
      radius = Math.max(20, Math.min(48, size * 0.60));

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
      points = [start, ...targets.map(({ x, y }, index) => ({
        // Skim the glyph's edge instead of covering its center, so the
        // character visibly stretches toward the moving glass sphere.
        x: Math.max(radius * 1.15, Math.min(width - radius * 1.15,
          x + (index % 2 === 0 ? 0.62 : -0.62) * radius)),
        y: Math.max(radius * 1.1, Math.min(height - radius * 1.1, y)),
      })), start];
      pathTimes = [0, ...ABSORB_AT.slice(0, targets.length), 1];
      resetGlyphs();
      sparks = [];
      fired = new Set();
      loop = -1;
      begin = performance.now();
      attitude = { ...INITIAL_ATTITUDE };
      lastOrb = null;
    };

    const absorb = (target: Target, now: number, index: number, orb: Point) => {
      const glyph = target.glyph;
      glyph.style.setProperty("--galaxy-pull-x", (orb.x - target.x) * 0.55 + "px");
      glyph.style.setProperty("--galaxy-pull-y", (orb.y - target.y) * 0.55 + "px");
      // The glyph remains intact at first, then stretches and gradually
      // dissolves. Nearby letters are distorted without disappearing.
      glyph.classList.add("galaxy-cipher-glyph--absorbed");
      hidden.set(glyph, now + 2400);
      const count = 88;
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
      if (lastOrb) attitude = rollGalaxy(attitude, orb.x - lastOrb.x, orb.y - lastOrb.y, radius);
      lastOrb = orb;

      // Local gravitational tide: adjacent glyphs lean toward the orb, then
      // return elastically. Do not alter layout or block links.
      const nextInfluenced = new Set<HTMLSpanElement>();
      const activeChars = Array.from(container.querySelectorAll<HTMLSpanElement>("[data-galaxy-glyph]"));
      for (let i = 0; i < targets.length; i += 1) {
        const distance = Math.abs(phase - ABSORB_AT[i]);
        if (distance > 0.022) continue;
        const strength = Math.sin(Math.PI * (1 - distance / 0.022));
        const glyphIndex = activeChars.indexOf(targets[i].glyph);
        for (let offset = -1; offset <= 1; offset += 1) {
          const neighbor = activeChars[glyphIndex + offset];
          if (!neighbor || hidden.has(neighbor)) continue;
          const rect = neighbor.getBoundingClientRect();
          const host = container.getBoundingClientRect();
          const gx = rect.left - host.left + rect.width / 2;
          const gy = rect.top - host.top + rect.height / 2;
          const scale = offset === 0 ? 0.18 : 0.12;
          const dx = Math.max(-8, Math.min(8, (orb.x - gx) * scale * strength));
          const dy = Math.max(-6, Math.min(6, (orb.y - gy) * scale * strength));
          neighbor.style.setProperty("--galaxy-gravity-x", dx.toFixed(2) + "px");
          neighbor.style.setProperty("--galaxy-gravity-y", dy.toFixed(2) + "px");
          neighbor.classList.add("galaxy-cipher-glyph--gravity");
          nextInfluenced.add(neighbor);
        }
      }
      for (const node of influenced) {
        if (nextInfluenced.has(node)) continue;
        node.classList.remove("galaxy-cipher-glyph--gravity");
        node.style.removeProperty("--galaxy-gravity-x");
        node.style.removeProperty("--galaxy-gravity-y");
      }
      influenced = nextInfluenced;
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
      drawGalaxy(ctx, orb, radius, attitude, now / 1000, flash);
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
