"use client";

import { useEffect, useRef, useState } from "react";
import { GALAXY } from "./GalaxyHeading";
import { isolatedSpiral } from "./isolatedSpiral";
import { GalaxyVoyage } from "./GalaxyVoyage";

type Point = { x: number; y: number };
type Grain = { source: Point; born: number; life: number; angle: number };
const TAU = Math.PI * 2;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

export function GalaxyOrb({
  unlocked,
  twinkle,
  onFirstTap,
}: {
  unlocked: boolean;
  twinkle: boolean;
  onFirstTap: () => void;
}) {
  // The globe stays visually present while locked. Keep input and reward
  // state fresh without restarting the original 3-D galaxy animation.
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;
  const twinkleRef = useRef(twinkle);
  twinkleRef.current = twinkle;
  const firstTapRef = useRef(onFirstTap);
  firstTapRef.current = onFirstTap;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const photoCreditRef = useRef<HTMLDivElement>(null);
  const [voyage, setVoyage] = useState<{
    x:number;y:number;radius:number;
    galaxyYaw:number;galaxyPitch:number;galaxyRoll:number;
  }|null>(null);

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
    let nearbyLetterPixels: Point[] = [];
    let grains: Grain[] = [];
    let lastSmallGrainAt=0;
    // While the orb enlarges, grains come from real hero/header lettering
    // across the top AND bottom of the visible screen (not a lower arc).
    type ZoomGrain = {
      source: Point; born: number; life: number; phase: number;
      curve: number; radius: number; brightness: number;
    };
    let zoomGrains: ZoomGrain[] = [];
    let zoomSources: Point[] = [];
    let zoomLastSpawn = 0;
    // Separate from the approved first-tap particles. Only zoomStep >= 2
    // uses this denser stream; the unexpanded and first-zoom orb are intact.
    let expandedSand: ZoomGrain[] = [];
    let expandedSandLastSpawn = 0;
    let zoomTextStyles: Array<{el: HTMLElement; opacity: string}> = [];
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
    // Stable twinkling points live INSIDE the moving glass orb, not on
    // the surrounding page. Their phases vary smoothly without a hard blink.
    const rewardLights = Array.from({ length: 25 }, (_, i) => {
      const angle = i * 2.39996 + 0.45;
      const distance = 0.13 + 0.62 * Math.sqrt((i + 0.5) / 25);
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        phase: i * 1.83,
        speed: 0.0019 + (i % 5) * 0.00029,
        size: 0.48 + (i % 4) * 0.12,
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
      // Nearby LETTERS, not arbitrary starfield pixels. Include title,
      // tagline, the descriptive paragraphs and navigation in the same
      // section. Sources are kept in the original canvas's local space.
      nearbyLetterPixels=[];
      const letterRange=document.createRange();
      const textEls=Array.from(section!.querySelectorAll<HTMLElement>(
        "h1, p, nav a, header a, header button, header span"
      ));
      for(const el of Array.from(new Set(textEls))){
        const rect=el.getBoundingClientRect();
        if(rect.width<1||rect.height<1)continue;
        const style=getComputedStyle(el);
        if(style.visibility==="hidden"||style.display==="none")continue;
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
        let node:Node|null;
        while((node=walker.nextNode())!==null&&nearbyLetterPixels.length<3500){
          const value=node.textContent??"";
          for(let i=0;i<value.length&&nearbyLetterPixels.length<3500;i++){
            if(!value[i].trim())continue;
            letterRange.setStart(node,i);letterRange.setEnd(node,i+1);
            const g=letterRange.getBoundingClientRect();
            if(g.width<1||g.height<1)continue;
            for(let j=0;j<2;j++){
              nearbyLetterPixels.push({
                x:g.left-sectionBounds.left+rand(.1,.9)*g.width,
                y:g.top-sectionBounds.top+rand(.15,.85)*g.height,
              });
            }
          }
        }
      }
      if(!nearbyLetterPixels.length)nearbyLetterPixels=textPixels.slice();
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

    function prepareZoomAbsorption() {
      // Keep true on-screen glyph positions, not a single fixed set of
      // pre-animated specks. A grain is born later at a NEW letter.
      const sources:Point[]=[];
      const els=[
        ...Array.from(document.querySelectorAll<HTMLElement>(
          "header a, header button, header span"
        )),
        ...Array.from(section!.querySelectorAll<HTMLElement>(
          "h1, p, nav a"
        )),
      ];
      const range=document.createRange();
      for(const el of Array.from(new Set(els))){
        const rect=el.getBoundingClientRect();
        if(rect.width<1||rect.height<1||rect.bottom<0||
           rect.top>window.innerHeight)continue;
        const style=getComputedStyle(el);
        if(style.visibility==="hidden"||style.display==="none"||
           parseFloat(style.opacity||"1")<.04)continue;
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
        let node:Node|null;
        while((node=walker.nextNode())!==null&&sources.length<3200){
          const value=node.textContent??"";
          for(let i=0;i<value.length&&sources.length<3200;i++){
            if(!value[i].trim())continue;
            range.setStart(node,i);range.setEnd(node,i+1);
            const g=range.getBoundingClientRect();
            if(g.width<1||g.height<1||g.bottom<0||
               g.top>window.innerHeight)continue;
            for(let k=0;k<3;k++){
              sources.push({x:g.left+rand(.12,.88)*g.width,
                y:g.top+rand(.12,.88)*g.height});
            }
          }
        }
      }
      if(!sources.length){
        zoomSources=textPixels.map(p=>({
          x:sectionBounds.left+p.x,y:sectionBounds.top+p.y,
        }));
      } else zoomSources=sources;
      zoomGrains=[];
      zoomLastSpawn=0;
      expandedSand=[];
      expandedSandLastSpawn=0;
      zoomTextStyles=Array.from(section!.querySelectorAll<HTMLElement>(
        "h1, p, nav a"
      )).filter(el=>el.getBoundingClientRect().width>0)
        .map(el=>({el,opacity:el.style.opacity}));
    }

    function drawExpandedSand(now:number,inside:boolean){
      // After the second tap, the incoming sand grows from a few dozen
      // independent specks into a fine irregular shower from all sides.
      // Nothing here runs for the smallest orb or first enlargement.
      const stage=smooth(clamp((zoomStep-2)/3,0,1));
      const capacity=Math.round(18+90*stage);
      const interval=mix(105,16,stage);
      const reach=Math.hypot(width,height);
      if(!inside){
        // Restore only on closing as before. Text remains readable even
        // when much of its fine material has left the page.
        for(const saved of zoomTextStyles){
          const isHeading=saved.el.matches("h1");
          saved.el.style.opacity=String(1-(.43+.30*stage)*(isHeading?.42:.72));
        }
        expandedSand=expandedSand.filter(p=>now-p.born<p.life);
        if(expandedSandLastSpawn===0)expandedSandLastSpawn=now-interval;
        const ready=Math.min(5,Math.floor((now-expandedSandLastSpawn)/interval));
        if(ready>0){
          // Prefer individual visible letter positions OUTSIDE the globe.
          // As the globe grows to cover the words, keep spawning from the
          // surrounding empty sky instead of allowing the stream to die.
          const candidates=zoomSources.filter(p=>{
            const d=Math.hypot(p.x-orb.x,p.y-orb.y);
            return d>radius*1.09 && d<reach &&
              p.x>=1&&p.x<width-1&&p.y>=1&&p.y<height-1;
          });
          for(let j=0;j<ready&&expandedSand.length<capacity;j++){
            let source:Point|null=null;
            if(candidates.length){
              // Different letters and directions; never a single fixed jet.
              for(let attempt=0;attempt<14;attempt++){
                const p=candidates[Math.floor(Math.random()*candidates.length)];
                if(expandedSand.every(q=>
                  Math.hypot(p.x-q.source.x,p.y-q.source.y)>21)){
                  source={x:p.x,y:p.y};break;
                }
                if(!source)source={x:p.x,y:p.y};
              }
            }
            if(!source){
              for(let attempt=0;attempt<32;attempt++){
                const bearing=rand(0,TAU);
                const d=radius*(1.16+rand(0,.80));
                const x=orb.x+Math.cos(bearing)*d;
                const y=orb.y+Math.sin(bearing)*d;
                if(x>3&&x<width-3&&y>3&&y<height-3){
                  source={x,y};break;
                }
              }
            }
            if(!source)continue;
            expandedSand.push({
              source,born:now-rand(0,interval),life:rand(2200,3700),
              phase:rand(0,TAU),curve:rand(-75,75),
              radius:rand(.28,.48),brightness:rand(.75,1),
            });
          }
          expandedSandLastSpawn=now;
        }
      }
      ctx.save();
      for(const p of expandedSand){
        const t=(now-p.born)/p.life;
        if(t<=0||t>=1)continue;
        const u=smooth(t);
        const dx=orb.x-p.source.x,dy=orb.y-p.source.y;
        const d=Math.max(1,Math.hypot(dx,dy));
        const bend=Math.sin(Math.PI*u)*p.curve;
        const x=mix(p.source.x,orb.x,u)-dy/d*bend;
        const y=mix(p.source.y,orb.y,u)+dx/d*bend;
        if(x<0||x>width||y<0||y>height)continue;
        const within=Math.hypot(x-orb.x,y-orb.y)<radius*.98;
        if(within!==inside)continue;
        const fade=smooth(t/.075)*(1-smooth((t-.83)/.17));
        const shimmer=.83+.17*Math.sin(now*.004+p.phase)**2;
        const alpha=p.brightness*fade*shimmer*(within?.27:.93);
        if(alpha<.018)continue;
        // Same tiny WHITE sand as the approved smallest orb:
        // no halo, glow, line, stick, comet tail or enlarged dots.
        ctx.fillStyle="rgba(255,255,255,"+alpha.toFixed(3)+")";
        ctx.beginPath();ctx.arc(x,y,p.radius,0,TAU);ctx.fill();
      }
      ctx.restore();
    }

    function drawZoomAbsorption(now:number,inside:boolean){
      if(!expanded)return;
      // Keep the exact first enlargement (and the smallest roaming orb)
      // previously approved. All increased sand starts at the SECOND tap.
      if(zoomStep>=2){
        drawExpandedSand(now,inside);
        return;
      }
      const spread=clamp((radius-normalRadius)/
        Math.max(1,maximumRadius-normalRadius),0,1);
      // Small sphere: 4-5 grains. Mid-sized sphere: about 15. The enlarged
      // sphere reaches lettering throughout the viewport.
      const capacity=Math.round(5+10*smooth(clamp((zoomStep-1)/3,0,1)));
      const reach=Math.max(radius*3.3,
        Math.hypot(width,height)*(.16+.85*smooth(spread)));
      const strength=.52+.48*smooth(spread);
      if(!inside){
        for(const saved of zoomTextStyles){
          const heading=saved.el.matches("h1");
          saved.el.style.opacity=String(1-strength*(heading?.22:.47));
        }
        zoomGrains=zoomGrains.filter(g=>now-g.born<g.life);
        const interval=capacity<=5?460:capacity<12?310:220;
        if(now-zoomLastSpawn>=interval && zoomGrains.length<capacity){
          const eligible=zoomSources.filter(p=>{
            const d=Math.hypot(p.x-orb.x,p.y-orb.y);
            return d>radius*1.07&&d<reach;
          });
          if(eligible.length){
            // Avoid two consecutive jets originating from the same glyph
            // or from neighbouring pixels on one line.
            let sample=eligible[Math.floor(Math.random()*eligible.length)];
            for(let trial=0;trial<16;trial++){
              const candidate=eligible[Math.floor(Math.random()*eligible.length)];
              if(zoomGrains.every(g=>Math.hypot(
                candidate.x-g.source.x,candidate.y-g.source.y)>26)){
                sample=candidate;break;
              }
            }
            zoomGrains.push({
              source:{...sample},born:now,life:rand(2900,4100),
              phase:rand(0,TAU),curve:rand(-70,70),
              radius:rand(.28,.48),brightness:rand(.72,1),
            });
          }
          zoomLastSpawn=now;
        }
      }
      ctx.save();
      for(const grain of zoomGrains){
        const t=(now-grain.born)/grain.life;
        if(t<=0||t>=1)continue;
        const a=smooth(t);
        const dx=orb.x-grain.source.x,dy=orb.y-grain.source.y;
        const d=Math.max(1,Math.hypot(dx,dy));
        const theta=Math.atan2(dy,dx);
        // The visible white fleck crosses the EMPTY space OUTSIDE glass,
        // then its much dimmer tail disappears into the galactic centre.
        const targetX=orb.x-Math.cos(theta)*radius*.16;
        const targetY=orb.y-Math.sin(theta)*radius*.16;
        const bend=grain.curve*Math.sin(Math.PI*a);
        function position(u:number){
          return {
            x:mix(grain.source.x,targetX,u)-dy/d*bend*
              Math.sin(Math.PI*u)/Math.max(.12,Math.sin(Math.PI*a)),
            y:mix(grain.source.y,targetY,u)+dx/d*bend*
              Math.sin(Math.PI*u)/Math.max(.12,Math.sin(Math.PI*a)),
          };
        }
        const pos=position(a);
        const within=Math.hypot(pos.x-orb.x,pos.y-orb.y)<radius*.98;
        if(within!==inside)continue;
        const alpha=strength*grain.brightness*
          smooth(t/.10)*(1-smooth((t-.82)/.18))*
          (within?.30:1);
        if(alpha<.018)continue;
        // Fine, clean white sand — no halo or line that enlarges the grain.
        ctx.fillStyle="rgba(255,255,251,"+Math.min(.98,alpha).toFixed(3)+")";
        ctx.beginPath();ctx.arc(pos.x,pos.y,grain.radius,0,TAU);ctx.fill();
      }
      ctx.restore();
    }

    function restoreZoomText(){
      for(const saved of zoomTextStyles)saved.el.style.opacity=saved.opacity;
      zoomTextStyles=[];
      zoomGrains=[];
      zoomSources=[];
      expandedSand=[];
      expandedSandLastSpawn=0;
    }

    function closeExpanded() {
      if (!expanded) return;
      restoreZoomText();
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

    function enterVoyage() {
      if (!unlockedRef.current || !expanded || !atMaximum) return;
      // Preserve this EXACT turning galaxy's orientation through the glass
      // rupture; the voyage must not start a newly rotated galaxy picture.
      const capture = {
        x:orb.x,y:orb.y,radius:Math.min(radius,maximumRadius),
        galaxyYaw,galaxyPitch,galaxyRoll,
      };
      // Hide only the animation layer; leave original homepage untouched.
      // The real ship, title and NASA/planetary journey stay in GalaxyVoyage.
      closeExpanded();
      document.documentElement.setAttribute("data-galaxy-voyage", "true");
      surface!.style.visibility = "hidden";
      setVoyage(capture);
    }

    function enlargeOneStep() {
      if (!unlockedRef.current) return;
      // The first deliberate tap acknowledges the Stage 1 reward. Subsequent
      // visits keep the unlock, but its invitation no longer needs to flash.
      if (twinkleRef.current) {
        twinkleRef.current = false;
        firstTapRef.current();
      }
      // Original approved interaction restored: every tap expands the GLASS
      // sphere by 1.3x. The tap AFTER reaching full size enters the journey.
      if (expanded && atMaximum) {
        enterVoyage();
        return;
      }
      if (!expanded) {
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
        surface!.setAttribute("aria-label", "Tap the glass galaxy to enlarge it");
        closeButton!.style.display = "grid";
        measure();
        prepareZoomAbsorption();
      }
      zoomStep += 1;
      const proposed = normalRadius * Math.pow(1.3, zoomStep);
      atMaximum = proposed >= maximumRadius * 0.92;
      targetRadius = atMaximum ? maximumRadius : Math.min(maximumRadius, proposed);
      // Do not black out the homepage when the sphere reaches full size.
      // Existing lettering must remain visible for the following
      // dust-absorption sequence; darkness comes only AFTER it is consumed.
      surface!.style.background = atMaximum
        ? "rgba(2, 9, 24, .12)"
        : "rgba(2, 9, 24, .06)";
      surface!.style.pointerEvents = atMaximum ? "auto" : "none";
      surface!.setAttribute("aria-label", atMaximum
        ? "One more tap to enter the galaxy"
        : "Tap again to enlarge the glass galaxy");
      // Keep the orb/button displayed all the way through maximum zoom.
      zoomButton!.style.display = "block";
      photoCredit!.style.display = "none";
      if (reduced()) {
        radius = targetRadius;
        updateZoomGeometry();
        render(performance.now(), 0);
      }
      zoomButton!.focus({ preventScroll: true });
      setReturnTimer();
    }

    function onEscape(event: KeyboardEvent) {
      if (expanded && event.key === "Escape") closeExpanded();
    }

    function onBackdropClick(event: MouseEvent) {
      if (!unlockedRef.current || !expanded || !atMaximum ||
          event.target === zoomButton) return;
      if (event.target === closeButton || closeButton!.contains(event.target as Node)) {
        closeExpanded();
        return;
      }
      // Maximum glass size: tapping the dark area may also begin the trip.
      // This is not a separate, automatically playing movie.
      enterVoyage();
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

    function emit(now:number){
      grains=grains.filter(p=>now-p.born<p.life).slice(-5);
      // At most four or five separate grains in flight. No repeated plume
      // from one corner, and no pause just because the galaxy is edge-on.
      if(now-lastSmallGrainAt<480 || grains.length>=5)return;
      const pool=(nearbyLetterPixels.length?nearbyLetterPixels:textPixels)
        .filter(p=>{
          const d=pointDistance(p,orb);
          return d>radius*1.10&&d<radius*3.5;
        });
      lastSmallGrainAt=now;
      if(!pool.length)return;
      let source=pool[Math.floor(Math.random()*pool.length)];
      for(let i=0;i<14;i++){
        const candidate=pool[Math.floor(Math.random()*pool.length)];
        if(grains.every(p=>pointDistance(candidate,p.source)>22)){
          source=candidate;break;
        }
      }
      grains.push({
        source:{...source},born:now,life:rand(2700,3800),
        angle:Math.atan2(source.y-orb.y,source.x-orb.x),
      });
    }

    function drawGrains(now:number,inside:boolean){
      for(const p of grains){
        const t=(now-p.born)/p.life;
        if(t<=0||t>=1)continue;
        const angle=p.angle;
        const endX=orb.x+Math.cos(angle)*radius*.24;
        const endY=orb.y+Math.sin(angle)*radius*.24;
        function position(u:number){
          const travel=smooth(u);
          return {
            x:mix(p.source.x,endX,travel)+
              Math.sin(Math.PI*travel)*7*Math.cos(angle+Math.PI/2),
            y:mix(p.source.y,endY,travel)+
              Math.sin(Math.PI*travel)*7*Math.sin(angle+Math.PI/2),
          };
        }
        const pos=position(t);
        const isInside=pointDistance(pos,orb)<radius*.98;
        if(isInside!==inside)continue;
        const alpha=smooth(t/.10)*(1-smooth((t-.82)/.18));
        if(alpha<.02)continue;
        // A single near-pixel-sized white sand grain, with no glow or trail.
        ctx.fillStyle="rgba(255,255,255,"+(alpha*(inside?.39:.92)).toFixed(3)+")";
        ctx.beginPath();ctx.arc(pos.x,pos.y,.43,0,TAU);ctx.fill();
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

      // Dark transparent optical body, not an opaque circular tunnel.
      const glass = ctx.createRadialGradient(-r * 0.32, -r * 0.4, r * 0.02, r * 0.20, r * 0.25, r * 1.35);
      glass.addColorStop(0, "rgba(47,82,131,0.32)");
      glass.addColorStop(0.49, "rgba(23,43,80,0.25)");
      glass.addColorStop(1, "rgba(3,10,27,0.42)");
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

      // The voyage used to replace this glass's built-in galaxy with a
      // DIFFERENT NASA galaxy the moment it broke. Use the very same M100
      // photograph that emerges after rupture (with a soft alpha feather);
      // while the asset loads, keep the existing bundled galaxy fallback.
      const isolated = unlockedRef.current
        ? getFeatheredGalaxy(nasaM100) ?? isolatedSpiral(galaxy)
        : isolatedSpiral(galaxy);
      if (isolated) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        // A faint displaced stellar layer supplies depth when the galaxy is
        // oblique or edge-on, while the crisp main spiral remains intact.
        if (edge > 0.18) {
          ctx.save();
          ctx.globalAlpha = edge * 0.12;
          ctx.translate(orientation.e * r * 0.07, orientation.f * r * 0.07);
          ctx.transform(orientation.a, orientation.b, orientation.c, orientation.d, 0, 0);
          ctx.drawImage(isolated, -r * 0.73, -r * 0.73, r * 1.46, r * 1.46);
          ctx.restore();
        }
        ctx.transform(orientation.a, orientation.b, orientation.c, orientation.d, 0, 0);
        // Make the existing photographic arms slightly easier to read inside
        // the glass, without replacing the approved image or drawing a fake
        // mathematical spiral. Both passes share the SAME 3-D orientation.
        ctx.drawImage(isolated, -r * 0.80, -r * 0.80, r * 1.60, r * 1.60);
        ctx.globalAlpha = 0.14;
        ctx.drawImage(isolated, -r * 0.80, -r * 0.80, r * 1.60, r * 1.60);
        ctx.restore();
      }

      // A halo exists above and below the disk. If the face turns edge-on,
      // retain its central bulge but never paste another square or flat JPEG.
      if (edge > 0.27 && isolated) {
        ctx.save();
        ctx.rotate(orientation.longAxis);
        ctx.scale(1, 0.30);
        ctx.globalAlpha = 0.15 * Math.pow((edge - 0.27) / 0.73, 1.2);
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(isolated, -r * 0.70, -r * 0.70, r * 1.40, r * 1.40);
        ctx.restore();
      }

      // A narrow warm-white nucleus remains legible even when the visible
      // spiral is tilted. Keep it optically restrained so it does not cover
      // the dark dust lanes or turn the galaxy into a glowing planet.
      if (face > 0.12) {
        ctx.save();
        ctx.rotate(orientation.longAxis);
        ctx.scale(1, 0.40 + face * 0.60);
        ctx.globalCompositeOperation = "screen";
        const nucleusLight = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.19);
        nucleusLight.addColorStop(0, `rgba(255,249,231,${(0.31 + face * 0.10).toFixed(3)})`);
        nucleusLight.addColorStop(0.22, `rgba(255,226,206,${(0.22 + face * 0.07).toFixed(3)})`);
        nucleusLight.addColorStop(0.58, "rgba(190,176,227,0.075)");
        nucleusLight.addColorStop(1, "rgba(190,176,227,0)");
        ctx.fillStyle = nucleusLight;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.19, 0, TAU);
        ctx.fill();
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
      ctx.arc(x, y, r * 0.994, 0, TAU);
      ctx.strokeStyle = "rgba(172,220,251,0.25)";
      ctx.lineWidth = Math.max(0.6, Math.min(1.3, r * 0.004));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.994, Math.PI * 1.13, Math.PI * 1.59);
      ctx.strokeStyle = "rgba(239,252,255,0.48)";
      ctx.lineWidth = Math.max(0.6, Math.min(1.05, r * 0.003));
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

    function drawEarnedStarlight(now: number) {
      if (!twinkleRef.current || expanded) return;
      const r = radius;
      ctx.save();
      ctx.translate(orb.x, orb.y);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.96, 0, TAU);
      ctx.clip();
      ctx.globalCompositeOperation = "screen";

      // The earned reward is an irregular constellation of tiny colored
      // stellar pinpricks. Avoid a single broad white flash or glowing ring.
      // Blue/cyan, rose/red, pale gold and a few neutral stars share the
      // ORIGINAL galaxy, which remains visible underneath.
      const colors = [
        "126,192,255", "255,128,149", "189,220,255",
        "255,187,155", "105,224,250", "242,231,201",
      ];
      for (const [i, light] of rewardLights.entries()) {
        const wave = .5+.5*Math.sin(now*light.speed+light.phase);
        const spark=Math.pow(wave,6.0);
        if(spark<.075)continue;
        const x=light.x*r, y=light.y*r;
        const size=r*(.016+light.size*.023);
        const power=spark*(.65+.35*(i%4)/3);
        const color=colors[i%colors.length];
        const glow=ctx.createRadialGradient(x,y,0,x,y,size*1.55);
        glow.addColorStop(0,"rgba("+color+","+(power*.75).toFixed(3)+")");
        glow.addColorStop(.24,"rgba("+color+","+(power*.38).toFixed(3)+")");
        glow.addColorStop(.68,"rgba("+color+","+(power*.10).toFixed(3)+")");
        glow.addColorStop(1,"rgba("+color+",0)");
        ctx.fillStyle=glow;
        ctx.beginPath();
        ctx.arc(x,y,size*1.55,0,TAU);
        ctx.fill();

        // Very short optical rays on occasional peaks only, never a
        // large white starburst covering the galactic spiral.
        if(i%7===0&&spark>.76){
          const arm=r*(.021+.019*spark);
          ctx.strokeStyle="rgba("+color+","+(power*.52).toFixed(3)+")";
          ctx.lineWidth=Math.max(.35,r*.0032);
          ctx.beginPath();
          ctx.moveTo(x-arm,y);ctx.lineTo(x+arm,y);
          ctx.moveTo(x,y-arm*.7);ctx.lineTo(x,y+arm*.7);
          ctx.stroke();
        }
      }
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
      // The first voyage galaxy is NASA M100. Only visitors who have
      // unlocked Stage 1 need its photograph; load it before they enter,
      // so the visible galaxy inside this glass matches what emerges.
      if(unlockedRef.current && !nasaPreloaded)preloadNasa();
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
        // Text is siphoned from its original upper AND lower positions
        // throughout the enlargement, not only after entering the voyage.
        drawZoomAbsorption(now,false);
        drawSphere();
        drawZoomAbsorption(now,true);
        return;
      }
      if (!reduced()) advance(now, elapsed);
      if (!reduced()) emit(now);
      drawGrains(now, false);
      drawSphere();
      drawEarnedStarlight(now);
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
        NASA/JPL-Caltech (M100, M31 Andromeda). Artistic space journey.
        <span className="sr-only">Artistic transition between actual observations, not a literal voyage.</span>
      </div>
      <button
        ref={zoomButtonRef}
        type="button"
        aria-label={unlocked
          ? "Enter galaxy voyage"
          : "Locked: finish atmospheric reentry Stage 1 to unlock this galaxy"}
        title={unlocked ? "Enter the galaxy" : "Complete Stage 1 to unlock"}
        disabled={!unlocked}
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
