"use client";

import { useEffect, useRef, useState } from "react";
import { GALAXY } from "./GalaxyHeading";
import { GalaxyVoyage } from "./GalaxyVoyage";

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
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const photoCreditRef = useRef<HTMLDivElement>(null);
  const [voyage, setVoyage] = useState<{ x: number; y: number; radius: number } | null>(null);

  function finishVoyage() {
    document.documentElement.removeAttribute("data-galaxy-voyage");
    if (surfaceRef.current) surfaceRef.current.style.visibility = "";
    setVoyage(null);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    const zoomButton = zoomButtonRef.current;
    const closeButton = closeButtonRef.current;
    const photoCredit = photoCreditRef.current;
    if (!canvas || !surface || !zoomButton || !closeButton || !photoCredit) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const ctx = context;
    const section = surface.parentElement;
    if (!section) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const galaxy = new Image();
    galaxy.src = GALAXY;
    // NASA-sourced observation photographs. Real galaxies are composited into
    // a fictional zoom-out journey; it is not a literal astronomical flight.
    // The deep field is lazy-loaded when the visitor starts enlarging.
    const nasaM100 = new Image();
    const nasaNGC2841 = new Image();
    const nasaDeepField = new Image();
    let nasaPreloaded = false;
    function preloadNasa() {
      if (nasaPreloaded) return;
      nasaPreloaded = true;
      nasaM100.src =
        "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia15/pia15910/PIA15910.jpg?fit=clip&w=1200";
      nasaNGC2841.src =
        "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia12/pia12001/PIA12001.jpg?fit=clip&w=1200";
      nasaDeepField.src =
        "https://assets.science.nasa.gov/dynamicimage/content/dam/science/missions/webb/science/2022/07/STScI-01G8H1K2BCNATEZSKVRN9Z69SR.png?fit=clip&w=1700";
      nasaDeepField.onerror = () => {
        // Original NASA asset (larger); only request it if the resized
        // NASA endpoint is unavailable.
        if (!nasaDeepField.src.includes("/dynamicimage/")) return;
        nasaDeepField.onerror = null;
        nasaDeepField.src =
          "https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2022/07/STScI-01G8H1K2BCNATEZSKVRN9Z69SR.png";
      };
    }

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
    let expanded = false;
    let atMaximum = false;
    let zoomStep = 0;
    // The visitor controls the camera. One full recession of an individual
    // galaxy takes around twenty deliberate taps, never elapsed time.
    const GALAXY_TAPS = 20;
    const LAST_TAP = GALAXY_TAPS * 3;
    let voyageTarget = 0;
    let voyagePosition = 0;
    let firstGalaxyAngle = 0;
    let secondGalaxyAngle = -0.31;
    const galaxyCutouts = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
    // Fixed star locations prevent re-randomising the deep-space background
    // on each frame and stay lightweight on mobile.
    const distantStars = Array.from({ length: 340 }, () => ({
      x: Math.random(), y: Math.random(),
      radius: rand(0.27, 1.05),
      opacity: rand(0.10, 0.65),
    }));
    let normalRadius = 46;
    let targetRadius = 46;
    let maximumRadius = 180;
    let zoomOrigin: Point = { x: 0, y: 0 };
    let restoreTimer: number | undefined;
    let oldBodyOverflow = "";
    let priorFocus: HTMLElement | null = null;
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
      if (expanded) {
        // Render at viewport resolution from the first zoom step onward.
        // The sphere itself, not the entire screen, grows 1.3x per tap.
        width = window.innerWidth;
        height = window.innerHeight;
        maximumRadius = Math.min(width * 0.46, height * 0.43, 440);
        if (atMaximum) {
          targetRadius = maximumRadius;
        } else {
          targetRadius = Math.min(maximumRadius, normalRadius * Math.pow(1.3, zoomStep));
        }
        if (reduced()) radius = targetRadius;
        const dpi = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas!.width = Math.max(1, Math.round(width * dpi));
        canvas!.height = Math.max(1, Math.round(height * dpi));
        ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
        updateZoomGeometry();
        frameTime = 0;
        return;
      }
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
      zoomButton!.style.width = `${radius * 2}px`;
      zoomButton!.style.height = `${radius * 2}px`;
      zoomButton!.style.transform = `translate3d(${orb.x - radius}px, ${orb.y - radius}px, 0)`;
    }


    function updateZoomGeometry() {
      if (!expanded) return;
      // Move progressively from the tapped position toward the viewport
      // centre; on the final tap the sphere fills the available screen.
      const progress = clamp(
        (radius - normalRadius) / Math.max(1, maximumRadius - normalRadius),
        0, 1,
      );
      const centreX = mix(zoomOrigin.x, width * 0.5, smooth(progress));
      const centreY = mix(zoomOrigin.y, height * 0.5, smooth(progress));
      orb = {
        x: clamp(centreX, radius + 3, Math.max(radius + 3, width - radius - 3)),
        y: clamp(centreY, radius + 3, Math.max(radius + 3, height - radius - 3)),
      };
      const hitRadius = Math.max(radius, targetRadius);
      zoomButton!.style.width = `${hitRadius * 2}px`;
      zoomButton!.style.height = `${hitRadius * 2}px`;
      zoomButton!.style.transform = `translate3d(${orb.x - hitRadius}px, ${orb.y - hitRadius}px, 0)`;
    }

    function closeExpanded() {
      if (!expanded) return;
      expanded = false;
      atMaximum = false;
      zoomStep = 0;
      voyageTarget = 0;
      voyagePosition = 0;
      if (restoreTimer !== undefined) {
        window.clearTimeout(restoreTimer);
        restoreTimer = undefined;
      }
      surface!.style.position = "";
      surface!.style.inset = "";
      surface!.style.width = "";
      surface!.style.height = "";
      surface!.style.zIndex = "";
      surface!.style.background = "";
      surface!.style.pointerEvents = "";
      surface!.style.touchAction = "";
      surface!.removeAttribute("role");
      surface!.removeAttribute("aria-modal");
      surface!.removeAttribute("aria-label");
      zoomButton!.style.display = "";
      closeButton!.style.display = "none";
      photoCredit!.style.display = "none";
      document.body.style.overflow = oldBodyOverflow;
      measure();
      priorFocus?.focus({ preventScroll: true });
    }

    function setReturnTimer() {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
      // Each tap restarts the idle countdown. The final deep-field view is
      // deliberately left on screen for 20 seconds, then returns to the orb.
      restoreTimer = window.setTimeout(closeExpanded, 20_000);
    }

    function enlargeOneStep() {
      // New Phase 2: first click cracks the sphere. All further camera steps
      // are controlled inside GalaxyVoyage, not by the old zoom machinery.
      const bounds = section!.getBoundingClientRect();
      document.documentElement.setAttribute("data-galaxy-voyage", "true");
      surface!.style.visibility = "hidden";
      setVoyage({ x: bounds.left + orb.x, y: bounds.top + orb.y, radius });
      // Preserve the original preview-only zoom code without invoking it.
      if (surface!.style.visibility === "hidden") return;
      if (expanded && atMaximum) return;
      if (!expanded) {
        preloadNasa();
        priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        normalRadius = radius;
        zoomStep = 0;
        const bounds = section!.getBoundingClientRect();
        zoomOrigin = { x: bounds.left + orb.x, y: bounds.top + orb.y };
        expanded = true;
        atMaximum = false;
        oldBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        surface!.style.position = "fixed";
        surface!.style.inset = "0";
        surface!.style.width = "100vw";
        surface!.style.height = "100dvh";
        surface!.style.zIndex = "99999";
        surface!.style.pointerEvents = "none";
        surface!.style.touchAction = "none";
        surface!.setAttribute("role", "dialog");
        surface!.setAttribute("aria-modal", "true");
        surface!.setAttribute("aria-label", "Tap again to enlarge galaxy");
        closeButton!.style.display = "grid";
        measure();
      }
      zoomStep += 1;
      const proposed = normalRadius * Math.pow(1.3, zoomStep);
      // Avoid an almost-invisible extra tap very near the maximum size.
      atMaximum = proposed >= maximumRadius * 0.92;
      targetRadius = atMaximum ? maximumRadius : Math.min(maximumRadius, proposed);
      surface!.style.background = atMaximum
        ? "rgba(2, 9, 24, 0.975)"
        : "rgba(2, 9, 24, 0.08)";
      surface!.style.pointerEvents = atMaximum ? "auto" : "none";
      surface!.setAttribute("aria-label", atMaximum ? "Deep space galaxy journey" : "Tap again to enlarge galaxy");
      if (atMaximum) {
        voyageTarget = 0;
        voyagePosition = 0;
        firstGalaxyAngle = 0;
        secondGalaxyAngle = -0.31;
        photoCredit!.style.display = "block";
        zoomButton!.style.display = "none";
      }
      if (reduced()) {
        radius = targetRadius;
        updateZoomGeometry();
        render(performance.now(), 0);
      }
      // Keep focus on the enlarging sphere to make repeated clicks or
      // keyboard activation easy. The close button remains available.
      zoomButton!.focus({ preventScroll: true });
      setReturnTimer();
    }

    function onEscape(event: KeyboardEvent) {
      if (expanded && event.key === "Escape") closeExpanded();
    }

    function onBackdropClick(event: MouseEvent) {
      if (!expanded || !atMaximum || event.target === zoomButton) return;
      if (event.target === closeButton || closeButton!.contains(event.target as Node)) {
        closeExpanded();
        return;
      }
      // The current GalaxyOrb button has already finished its 1.3x phase.
      // Every tap on the cosmic scene advances exactly one camera step.
      if (voyageTarget < LAST_TAP) voyageTarget += 1;
      setReturnTimer();
      if (reduced()) {
        voyagePosition = voyageTarget;
        render(performance.now(), 0);
      }
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
      rotateGalaxy(elapsed);
      prev = { ...orb };
    }

    function rotateGalaxy(elapsed: number) {
      // The approved independent three-axis rotation remains continuous
      // during the 10-second close-up.
      galaxyYaw = (galaxyYaw + elapsed * 0.00011) % TAU;
      galaxyPitch = (galaxyPitch + elapsed * 0.00008) % TAU;
      galaxyRoll = (galaxyRoll + elapsed * 0.00014) % TAU;
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



    function getFeatheredGalaxy(img: HTMLImageElement): HTMLCanvasElement | null {
      if (!img.complete || img.naturalWidth < 1 || img.naturalHeight < 1) return null;
      const cached = galaxyCutouts.get(img);
      if (cached) return cached;
      // Offscreen alpha feather: unlike 'screen' alone this makes the original
      // photo's square background TRANSPARENT. Keep it cached per NASA image.
      const cutout = document.createElement("canvas");
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const size = Math.min(1400, side);
      cutout.width = size;
      cutout.height = size;
      const c = cutout.getContext("2d");
      if (!c) return null;
      c.drawImage(img,
        (img.naturalWidth - side) * 0.5, (img.naturalHeight - side) * 0.5,
        side, side, 0, 0, size, size);
      c.globalCompositeOperation = "destination-in";
      const feather = c.createRadialGradient(size * 0.5, size * 0.5, size * 0.24,
        size * 0.5, size * 0.5, size * 0.49);
      feather.addColorStop(0, "rgba(255,255,255,1)");
      feather.addColorStop(0.55, "rgba(255,255,255,0.94)");
      feather.addColorStop(0.84, "rgba(255,255,255,0.29)");
      feather.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = feather;
      c.fillRect(0, 0, size, size);
      c.globalCompositeOperation = "source-over";
      galaxyCutouts.set(img, cutout);
      return cutout;
    }

    function drawGalaxyPhoto(
      img: HTMLImageElement,
      x: number, y: number, diameter: number, alpha: number, rotation: number,
    ) {
      if (diameter < 1 || alpha <= 0.001) return;
      const cutout = getFeatheredGalaxy(img);
      if (!cutout) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(cutout, -diameter * 0.5, -diameter * 0.5, diameter, diameter);
      ctx.restore();
    }

    function drawDeepField(img: HTMLImageElement, opacity: number, p: number) {
      if (!img.complete || img.naturalWidth < 1 || opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp(opacity, 0, 1);
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      // True full-screen image: its outer edges are never visible as a pasted
      // rectangle. Pull back slightly as the final taps are made.
      const factor = Math.max(width / iw, height / ih) * (1.12 - 0.12 * p);
      const dw = iw * factor;
      const dh = ih * factor;
      ctx.drawImage(img, (width - dw) * 0.5, (height - dh) * 0.5, dw, dh);
      ctx.restore();
    }

    function drawCosmicJourney(elapsed: number) {
      // Progress changes ONLY when tapped; interpolate each individual tap
      // gently rather than starting an automatic film.
      const fraction = reduced() ? 1 : Math.min(1, elapsed / 175);
      voyagePosition = mix(voyagePosition, voyageTarget, fraction);
      if (Math.abs(voyagePosition - voyageTarget) < 0.006) voyagePosition = voyageTarget;
      const step = voyagePosition;
      const shortSide = Math.min(width, height);

      const backdrop = ctx.createRadialGradient(
        width * 0.46, height * 0.43, 0,
        width * 0.5, height * 0.5, Math.hypot(width, height) * 0.75,
      );
      backdrop.addColorStop(0, "#0b1025");
      backdrop.addColorStop(0.45, "#020711");
      backdrop.addColorStop(1, "#000209");
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, width, height);

      // Small fixed stars hold their positions in one continuous cosmic space.
      for (const star of distantStars) {
        const visibility = clamp(((step / GALAXY_TAPS) * 1.6 + 0.12) * star.opacity, 0, 1);
        ctx.fillStyle = "rgba(207,221,255," + visibility.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.radius, 0, TAU);
        ctx.fill();
      }

      // Phase 1: genuine Spitzer M100 recedes for about 20 taps until it is
      // a pinpoint. Slow rotation stops while still visibly larger than a star.
      const firstDiameter = shortSide * 3.1 * Math.pow(0.79, Math.min(step, GALAXY_TAPS));
      if (!reduced() && firstDiameter > shortSide * 0.19) {
        firstGalaxyAngle += elapsed * 0.00007;
      }
      const firstFade = step < 22 ? 1 : clamp(1 - (step - 22) / 12, 0, 1);
      drawGalaxyPhoto(
        nasaM100,
        mix(width * 0.50, width * 0.26, smooth(clamp(step / GALAXY_TAPS, 0, 1))),
        mix(height * 0.51, height * 0.32, smooth(clamp(step / GALAXY_TAPS, 0, 1))),
        firstDiameter,
        firstFade,
        firstGalaxyAngle,
      );

      // Phase 2: a different REAL galaxy appears naturally as M100 reaches
      // star size. Subsequent taps make that galaxy recede independently.
      const secondAppear = smooth(clamp((step - 15) / 6, 0, 1));
      const secondStep = Math.max(0, step - GALAXY_TAPS);
      const secondDiameter = shortSide * 0.92 * Math.pow(0.80, Math.min(secondStep, GALAXY_TAPS));
      if (!reduced() && secondDiameter > shortSide * 0.19 && step >= 15) {
        secondGalaxyAngle += elapsed * 0.000065;
      }
      const secondFade = step < 43 ? 1 : clamp(1 - (step - 43) / 11, 0, 1);
      drawGalaxyPhoto(
        nasaNGC2841,
        width * 0.70,
        height * 0.55,
        secondDiameter,
        secondAppear * secondFade,
        secondGalaxyAngle,
      );

      // During the last twenty deliberate taps the genuine Webb deep-field
      // photograph replaces the isolated galaxies. This is a fictional
      // composition of real observations, not a spatially accurate fly-through.
      const finalP = smooth(clamp((step - GALAXY_TAPS * 2) / GALAXY_TAPS, 0, 1));
      drawDeepField(nasaDeepField, finalP, finalP);
      if (!nasaDeepField.complete && finalP > 0) {
        // A deterministic fallback avoids a blank final stage when offline.
        for (const star of distantStars) {
          ctx.fillStyle = "rgba(238,195,164," + (star.opacity * finalP * 0.55).toFixed(3) + ")";
          ctx.beginPath();
          ctx.ellipse(star.x * width, star.y * height, star.radius * 1.8, star.radius * 0.9, 0.24, 0, TAU);
          ctx.fill();
        }
      }
    }

    function render(now: number, elapsed: number) {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      if (expanded) {
        if (!reduced()) {
          rotateGalaxy(elapsed);
          rolling += elapsed * 0.00022;
          const fraction = Math.min(1, elapsed / 150);
          radius = mix(radius, targetRadius, fraction);
          if (Math.abs(radius - targetRadius) < 0.15) radius = targetRadius;
        }
        updateZoomGeometry();
        if (atMaximum) {
          drawCosmicJourney(elapsed);
        } else {
          drawSphere();
        }
        return;
      }
      if (!reduced()) advance(now, elapsed);
      const face = galaxyOrientation().face;
      if (!reduced()) emit(now, face);
      drawGrains(now, false);
      drawSphere();
      drawGrains(now, true);
      // Only this circular transparent hit target accepts taps; the
      // surrounding page and its existing navigation remain interactive.
      zoomButton!.style.transform = `translate3d(${orb.x - radius}px, ${orb.y - radius}px, 0)`;
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
    zoomButton.addEventListener("click", enlargeOneStep);
    surface.addEventListener("click", onBackdropClick);
    window.addEventListener("keydown", onEscape);
    window.addEventListener("resize", measure);
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
      zoomButton.removeEventListener("click", enlargeOneStep);
      surface.removeEventListener("click", onBackdropClick);
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", measure);
      closeExpanded();
      document.documentElement.removeAttribute("data-galaxy-voyage");
    };
  }, []);

  return (
    <>
    <div ref={surfaceRef} className="pointer-events-none absolute inset-0 z-[2]">
      <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
      <div
        ref={photoCreditRef}
        className="pointer-events-none absolute bottom-3 left-4 right-4 hidden text-center text-[10px] leading-4 tracking-wide text-white/65"
      >
        NASA/JPL-Caltech (M100, NGC 2841) · NASA/ESA/CSA/STScI (SMACS 0723)
        <span className="sr-only">Artistic transition between actual observations, not a literal voyage.</span>
      </div>
      <button
        ref={zoomButtonRef}
        type="button"
        aria-label="Enter galaxy voyage"
        title="Enter the galaxy"
        className="pointer-events-auto absolute left-0 top-0 rounded-full border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200"
        style={{ touchAction: "manipulation" }}
      />
      <button
        ref={closeButtonRef}
        type="button"
        aria-label="Close enlarged galaxy"
        title="Close"
        className="pointer-events-auto absolute right-5 top-5 hidden h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/40 text-3xl leading-none text-white"
      >
        ×
      </button>
    </div>
    {voyage && <GalaxyVoyage origin={voyage} onExit={finishVoyage} />}
  </>);
}
