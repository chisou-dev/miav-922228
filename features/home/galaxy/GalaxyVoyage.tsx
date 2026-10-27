"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GALAXY } from "./GalaxyHeading";
import { drawStage1EntryCraft } from "./drawStage1EntryCraft";
import { createGalaxyFlightScene } from "./GalaxyFlightScene";
import { createGalaxyClusterOrb } from "./GalaxyClusterOrb";
import { isolatedSpiral } from "./isolatedSpiral";
import { isGalaxySoundEnabled, playGalaxyCue, setGalaxySoundEnabled } from "./galaxyInteractionAudio";

type Point = { x: number; y: number };
type Star = { x: number; y: number; r: number; alpha: number; speed: number; phase: number; hue: number };
type Dust = {
  x: number; y: number; delay: number; speed: number;
  drift: number; wobble: number; phase: number; radius: number;
  brightness: number;
};

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => { const v = clamp(t, 0, 1); return v * v * (3 - 2 * v); };
const NASA_M100 = "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia15/pia15910/PIA15910.jpg?fit=clip&w=1200";
const FIRST_STAR_STEP = 30;
const FIRST_PLANET_STEP = 31;
// End when all nearby worlds have dwindled to star-like points.
const FINAL_STEP = 184;
// Three seconds of gradual typography + page-colour absorption BEFORE the
// unchanged glass rupture and normal space voyage begin.
const PEEL_MS = 3000;
const IMPLOSION_MS = 2650;
const FINAL_HOLD_MS = 180_000;
const IDLE_MS = 120_000;

function sampleTextLocations(includeHeading = true): Point[] {
  // After the glass breaks, fine dust comes from EVERY visible glyph on the
  // homepage, not only randomly selected letters. Keep the existing drawSand
  // animation, glass transition, title erosion and voyage timing unchanged.
  const points: Point[] = [];
  const elements = document.querySelectorAll(
    "header a, header button, header span, main section:first-of-type h1, " +
    "main section:first-of-type p, main section:first-of-type nav a, " +
    "main section:first-of-type aside span"
  );
  const range = document.createRange();
  for (const el of elements) {
    if (!includeHeading && (el.matches("h1") || el.closest("h1"))) continue;
    if (points.length >= 3000) break;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" ||
        Number.parseFloat(style.opacity || "1") < .03) continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode()) !== null && points.length < 3000) {
      const text = node.textContent ?? "";
      for (let i=0;i<text.length && points.length<3000;i++) {
        if (!text[i].trim()) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || r.right < 0 ||
            r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
        for (let n=0;n<3 && points.length<3000;n++) {
          points.push({
            x:r.left+r.width*(.08+.84*Math.random()),
            y:r.top+r.height*(.10+.80*Math.random()),
          });
        }
      }
    }
  }
  range.detach();
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
  const [soundOn, setSoundOn] = useState(isGalaxySoundEnabled);
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
    // Timers used by the existing shattering/galaxy sequence start AFTER
    // the pre-rupture peel; existing IMPLOSION_MS timing remains unchanged.
    const opened = previous + PEEL_MS;
    // Pitched, airy glass release after the 3-second pigment absorption.
    // Scheduled from the enter-voyage click; cancelled if the user exits.
    const ruptureTimer = window.setTimeout(() => {
      if (!document.hidden) playGalaxyCue("rupture");
    }, PEEL_MS + IMPLOSION_MS * .64);
    let viewWidth = window.innerWidth;
    let viewHeight = window.innerHeight;
    let progress = 0;
    let target = 0;
    let titleTapStartedAt = performance.now();
    // Start both galaxies face-on. Independent rotations are accumulated
    // only while they are visibly large enough to appreciate the tumbling.
    let firstRotation = 0.08;
    let nextRotation = 0.16;
    let finalTimer: number | undefined;
    let idleTimer: number | undefined;
    // Reaching the enclosing glass orb begins the three-minute quiet ending.
    let finalReachedAt: number | null = null;
    let lastAdvanceAt = 0;
    // The fourth tap is the one-time inward sweep of released lettering.
    // Subsequent taps keep their existing camera/galaxy distances.
    let sandSuctionStartedAt: number | null = null;

    // The NASA images really are telescope observations. They are composited
    // as an artistic journey, not as an accurate atlas of galaxy positions.
    const globe = new Image();
    globe.src = GALAXY;
    const first = new Image();
    first.src = NASA_M100;
    const prepared = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
    const selectedText = sampleTextLocations();
    const nonHeadingText = sampleTextLocations(false);
    // Every particle starts on a REAL homepage glyph; no extra title is
    // rasterised or brought back after the dark transition.
    const sourcePoints=selectedText.length ? selectedText :
      [{x:viewWidth*.51,y:viewHeight*.52}];
    // Keep the REAL title as the last text to be consumed. After the opening
    // glass has vanished, the visitor deliberately dissolves it in THREE
    // taps. Sample actual text glyph rectangles across the entire title,
    // not an artificial line of dust from the bottom edge.
    const titleSpan=document.querySelector<HTMLElement>("[data-galaxy-title]");
    const titleStyle=titleSpan?getComputedStyle(titleSpan):null;
    const titleLabel=titleSpan?.textContent?.trim() || "MIAV-922228";
    type TitleParticle={x:number;y:number;delay:number;radius:number;bend:number;phase:number;band:number};
    let titleBase:HTMLCanvasElement|null=null;
    let titleEroded:HTMLCanvasElement|null=null;
    // Erosion thresholds follow the true GLYPH OUTLINE. This deliberately
    // avoids random round holes (the previous insect-eaten appearance).
    let titleEdgeRank:Uint8Array|null=null;
    let titleOriginalPixels:Uint8ClampedArray|null=null;
    let titleParticles:TitleParticle[]=[];
    let titleErosionFrame=-1;
    // Preserve the actual homepage location for the whole animation,
    // including after the original DOM is covered by the space canvas.
    const originalTitleRect=titleSpan?.getBoundingClientRect() ?? null;
    // Render the heading as a large TRUE glyph mask. Removing pieces of
    // these glyphs is fundamentally different from fading the text layer.
    function prepareTitle() {
      if(titleBase&&titleEroded)return;
      // Paint exactly where the homepage title was placed. Never centre or
      // enlarge a new title when the glass disappears.
      const weight=titleStyle?.fontWeight||"500";
      const family=titleStyle?.fontFamily||'Georgia, "Yu Mincho", serif';
      const fontSize=parseFloat(titleStyle?.fontSize||"")||34;
      const tracking=parseFloat(titleStyle?.letterSpacing||"")||0;
      const rect=originalTitleRect;
      const base=document.createElement("canvas");
      const expectedWidth=rect?.width??viewWidth*.7;
      const expectedHeight=rect?.height??fontSize*1.15;
      base.width=Math.max(2,Math.ceil(expectedWidth+8));
      base.height=Math.max(2,Math.ceil(expectedHeight+8));
      const b=base.getContext("2d",{willReadFrequently:true});
      if(!b)return;
      b.font=weight+" "+fontSize+"px "+family;
      b.textAlign="left";b.textBaseline="alphabetic";
      b.fillStyle="rgba(251,245,235,1)";
      const metrics=b.measureText(titleLabel);
      const ascent=metrics.actualBoundingBoxAscent||fontSize*.75;
      const descent=metrics.actualBoundingBoxDescent||fontSize*.20;
      const baseline=(base.height+ascent-descent)*.5;
      let drawX=4;
      for(const char of titleLabel){
        b.fillText(char,drawX,baseline);
        drawX+=b.measureText(char).width+tracking;
      }
      const mask=b.getImageData(0,0,base.width,base.height).data;
      const pixels:Point[]=[];
      for(let y=1;y<base.height-1;y+=2){
        for(let x=1;x<base.width-1;x+=2){
          if(mask[(y*base.width+x)*4+3]>125)pixels.push({x,y});
        }
      }
      if(!pixels.length)return;
      // Chamfer distance to transparent exterior, calculated only once.
      // Letter edges and weak serif ends crumble first; the thick strokes
      // survive longer, like wood weathering from its exposed tips.
      const w=base.width,h=base.height;
      const len=w*h;
      const distance=new Float32Array(len);
      for(let idx=0;idx<len;idx++){
        distance[idx]=mask[idx*4+3]>64?100:0;
      }
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const idx=y*w+x;
        if(distance[idx]===0)continue;
        let d=distance[idx];
        if(x>0)d=Math.min(d,distance[idx-1]+1);
        if(y>0){
          d=Math.min(d,distance[idx-w]+1);
          if(x>0)d=Math.min(d,distance[idx-w-1]+1.414);
          if(x<w-1)d=Math.min(d,distance[idx-w+1]+1.414);
        }
        distance[idx]=d;
      }
      for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){
        const idx=y*w+x;
        if(distance[idx]===0)continue;
        let d=distance[idx];
        if(x<w-1)d=Math.min(d,distance[idx+1]+1);
        if(y<h-1){
          d=Math.min(d,distance[idx+w]+1);
          if(x>0)d=Math.min(d,distance[idx+w-1]+1.414);
          if(x<w-1)d=Math.min(d,distance[idx+w+1]+1.414);
        }
        distance[idx]=d;
      }
      // Each vertical slice of genuine glyph ink has its own top and bottom.
      // Their uneven exposure and the distance to a free edge determine
      // when fragments rot away: ragged timber, never evenly punched holes.
      const top=new Int16Array(w).fill(h);
      const bottom=new Int16Array(w).fill(-1);
      for(let x=0;x<w;x++)for(let y=0;y<h;y++){
        if(mask[(y*w+x)*4+3]>48){
          top[x]=Math.min(top[x],y);
          bottom[x]=Math.max(bottom[x],y);
        }
      }
      const ranks=new Uint8Array(len);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const idx=y*w+x;
        if(mask[idx*4+3]<4){ranks[idx]=0;continue;}
        const topDepth=(y-top[x])/Math.max(1,bottom[x]-top[x]);
        const bottomDepth=(bottom[x]-y)/Math.max(1,bottom[x]-top[x]);
        const exposure=2*Math.max(0,Math.min(topDepth,bottomDepth));
        const ripples=.50+
          .22*Math.sin(x*.098+y*.042)+
          .17*Math.sin(x*.187-y*.074)+
          .11*Math.sin(x*.41+y*.15);
        const edge=Math.min(1,Math.max(0,(distance[idx]-.4)/3.8));
        const vulnerability=.085+.64*exposure+.21*edge+
          .13*ripples+.045*Math.sin(x*.047-y*.125);
        ranks[idx]=Math.round(Math.max(.035,Math.min(.995,vulnerability))*255);
      }
      titleEdgeRank=ranks;
      titleOriginalPixels=new Uint8ClampedArray(mask);
      // Use ACTUAL vulnerable pixels of the glyph mask: exposed top and
      // bottom strokes at tap 1, deeper broken strokes at tap 2, and the
      // final surviving timber-like splinters at tap 3. Unlike a generic
      // star layer, every newly released grain genuinely starts on a letter.
      const pools=[pixels.filter(p=>{
        const rank=ranks[p.y*w+p.x]/255;
        return rank<=.24;
      }),pixels.filter(p=>{
        const rank=ranks[p.y*w+p.x]/255;
        return rank>=.17&&rank<=.56;
      }),pixels.filter(p=>{
        const rank=ranks[p.y*w+p.x]/255;
        return rank>=.43;
      })];
      titleParticles=Array.from({length:5700},(_,n)=>{
        const band=n<1350?1:n<3400?2:3;
        const selected=pools[band-1].length?pools[band-1]:pixels;
        const p=selected[Math.floor(Math.random()*selected.length)];
        return {x:p.x+(Math.random()-.5)*1.4,
          y:p.y+(Math.random()-.5)*1.4,
          delay:Math.random(),
          // Tiny white sand, not luminous balls or streaks; just visible
          // enough against deep space in desktop and mobile browsers.
          radius:.48+Math.random()*.36,
          bend:(Math.random()-.5)*135,
          phase:Math.random()*TAU,band};
      });
      titleBase=base;titleEroded=document.createElement("canvas");
      titleEroded.width=base.width;titleEroded.height=base.height;
      titleErosionFrame=-1;
    }
    function titleOrigin(){
      if(!titleBase)return {x:0,y:0};
      return {
        x:originalTitleRect ? originalTitleRect.left-4 : (viewWidth-titleBase.width)*.5,
        y:originalTitleRect ? originalTitleRect.top-4 : (viewHeight-titleBase.height)*.5,
      };
    }
    // Stable random background flakes and independent letter grains are
    // prepared once so there is no visual flicker between animation frames.
    // The many small, independent origins make the entire blue site appear
    // to weather into fine matter rather than simply switching to black.
    const peelDust = Array.from({
      length:Math.min(16500,Math.max(10400,Math.round(viewWidth*viewHeight/125))),
    },(_,i)=>{
      // Roughly half the storm is actual letter matter; the rest consists
      // of the blue pigment being sucked from across the entire page.
      const fromText=i%2===0&&nonHeadingText.length>0;
      const source=fromText
        ?nonHeadingText[Math.floor(Math.random()*nonHeadingText.length)]
        :{x:Math.random()*viewWidth,y:Math.random()*viewHeight};
      const dx=origin.x-source.x,dy=origin.y-source.y;
      const length=Math.max(1,Math.hypot(dx,dy));
      return {
        x:source.x,y:source.y,
        dx,dy,acrossX:-dy/length,acrossY:dx/length,
        born:Math.random()*.68,
        duration:.28+Math.random()*.30,
        curl:(Math.random()-.5)*(28+Math.min(110,length*.12)),
        phase:Math.random()*TAU,
        radius:.32+Math.random()*.47,
        alpha:.72+Math.random()*.28,
        fromText,
      };
    });
    // Bright foreground sand is independent of the faint pigment flecks.
    // About one third detaches from actual non-title glyphs, one third
    // enters from random screen edges, and one third comes from the entire
    // blue page. This must remain conspicuously visible on phone displays.
    const whiteStorm=Array.from({
      length:Math.min(6800,Math.max(4000,Math.round(viewWidth*viewHeight/170))),
    },(_,i)=>{
      const fromText=i%3===0 && nonHeadingText.length>0;
      let source:Point;
      if(fromText){
        const letter=nonHeadingText[Math.floor(Math.random()*nonHeadingText.length)];
        source={x:letter.x,y:letter.y};
      }else if(i%3===1){
        const edge=Math.floor(Math.random()*4);
        source=edge===0?{x:Math.random()*viewWidth,y:0}:
          edge===1?{x:viewWidth,y:Math.random()*viewHeight}:
          edge===2?{x:Math.random()*viewWidth,y:viewHeight}:
          {x:0,y:Math.random()*viewHeight};
      }else{
        source={x:Math.random()*viewWidth,y:Math.random()*viewHeight};
      }
      const vx=origin.x-source.x,vy=origin.y-source.y;
      const d=Math.max(1,Math.hypot(vx,vy));
      return {
        x:source.x,y:source.y,
        vx,vy,sideX:-vy/d,sideY:vx/d,
        start:Math.random()*.69,
        duration:.28+Math.random()*.48,
        bend:(Math.random()-.5)*Math.min(170,40+d*.17),
        phase:Math.random()*TAU,
        size:.58+Math.random()*.43,
        opacity:.83+Math.random()*.17,
      };
    });
    const dust: Dust[] = Array.from({length:3600},(_,i)=>{
      const p=sourcePoints[i%sourcePoints.length];
      return {
        x:p.x+(Math.random()-.5)*2.3,
        y:p.y+(Math.random()-.5)*2.3,
        delay:Math.pow(Math.random(),.75)*.59,
        speed:.71+Math.random()*.51,
        drift:(Math.random()-.5)*115,
        wobble:Math.random()*TAU,
        phase:Math.random()*TAU,
        radius:.09+Math.random()*.28,
        brightness:.38+Math.random()*.62
      };
    });
    // The galaxy keeps drawing in small WHITE grains even before any tap.
    // These independent sources run continuously, with more material
    // circulating during the three irregular letter-erosion stages.
    const orbitSand=Array.from({length:1500},()=>({
      bearing:Math.random()*TAU,
      distance:.35+Math.random()*1.4,
      phase:Math.random(),
      duration:2300+Math.random()*3100,
      bend:(Math.random()-.5)*130,
      wobble:Math.random()*TAU,
      radius:.21+Math.random()*.26,
      brightness:.5+Math.random()*.5,
    }));
    function drawOrbitSand(now:number,step:number){
      // The small floating sand population stays unchanged through tap 3.
      // On tap 4, capture its exact current location and pull it all in.
      if(sandSuctionStartedAt!==null){
        const elapsed=now-sandSuctionStartedAt;
        if(elapsed>=1150)return;
        const cx=viewWidth*.51,cy=viewHeight*.52;
        const short=Math.min(viewWidth,viewHeight);
        ctx!.save();
        for(const grain of orbitSand){
          const age=sandSuctionStartedAt-opened+grain.phase*grain.duration;
          const t=((age%grain.duration)+grain.duration)%grain.duration/grain.duration;
          const travel=ease(t);
          const sx=cx+Math.cos(grain.bearing)*short*grain.distance;
          const sy=cy+Math.sin(grain.bearing)*short*grain.distance*.68;
          const dx=cx-sx,dy=cy-sy;
          const d=Math.max(1,Math.hypot(dx,dy));
          const curve=grain.bend*Math.sin(Math.PI*travel);
          const px=sx+dx*travel-dy/d*curve+
            Math.sin(t*23+grain.wobble)*2*(1-travel);
          const py=sy+dy*travel+dx/d*curve+
            Math.cos(t*19+grain.wobble)*2*(1-travel);
          const wait=grain.phase*145;
          const u=ease((elapsed-wait)/(700+grain.duration*.055));
          if(u<=0||u>=1)continue;
          const r=Math.hypot(px-cx,py-cy);
          const bend=(grain.bend*.21)*Math.sin(Math.PI*u);
          const x=px+(cx-px)*u-(py-cy)/Math.max(1,r)*bend;
          const y=py+(cy-py)*u+(px-cx)/Math.max(1,r)*bend;
          if(x<0||x>=viewWidth||y<0||y>=viewHeight)continue;
          const alpha=grain.brightness*(1-ease((u-.80)/.20));
          ctx!.fillStyle="rgba(255,255,253,"+alpha.toFixed(3)+")";
          ctx!.fillRect(x,y,grain.radius*.80,grain.radius*.80);
        }
        ctx!.restore();
        return;
      }
      if(step>3)return;
      const intensity=step<=3?1:1-ease((step-3)/9);
      if(intensity<=.002)return;
      const cap=step<1?420:step<2?680:step<3?940:1500;
      const cx=viewWidth*.51,cy=viewHeight*.52;
      const short=Math.min(viewWidth,viewHeight);
      ctx!.save();
      for(let i=0;i<cap;i++){
        const grain=orbitSand[i];
        const age=now-opened+grain.phase*grain.duration;
        const t=((age%grain.duration)+grain.duration)%grain.duration/grain.duration;
        const u=ease(t);
        const sx=cx+Math.cos(grain.bearing)*short*grain.distance;
        const sy=cy+Math.sin(grain.bearing)*short*grain.distance*.68;
        const dx=cx-sx,dy=cy-sy;
        const d=Math.max(1,Math.hypot(dx,dy));
        const curve=grain.bend*Math.sin(Math.PI*u);
        const x=sx+dx*u-dy/d*curve+
          Math.sin(t*23+grain.wobble)*2*(1-u);
        const y=sy+dy*u+dx/d*curve+
          Math.cos(t*19+grain.wobble)*2*(1-u);
        if(x<0||x>=viewWidth||y<0||y>=viewHeight)continue;
        const fade=ease(t/.08)*(1-ease((t-.83)/.17));
        const alpha=grain.brightness*intensity*fade*.91;
        if(alpha<.025)continue;
        ctx!.fillStyle="rgba(255,255,253,"+alpha.toFixed(3)+")";
        const r=grain.radius*(1-.42*u);
        ctx!.fillRect(x,y,r,r);
      }
      ctx!.restore();
    }

    // The original DOM text remains visible until it is consumed. Fade it
    // WHILE sand is departing. Preserve exact inline styles for the return.
    const section=document.querySelector("[data-galaxy-title]")?.closest("section");
    const textElements=Array.from(new Set([
      ...Array.from(section?.querySelectorAll<HTMLElement>(
        "h1, p, nav a, aside"
      )??[]),
      ...Array.from(document.querySelectorAll<HTMLElement>(
        "header, header a, header button, header span, body > nav, body > aside"
      )),
    ])).filter(el=>el.getBoundingClientRect().width>0 &&
      (!titleSpan || !el.contains(titleSpan) || el.matches("h1")));
    const savedTextStyles=textElements.map(el=>({
      el,opacity:el.style.opacity,transition:el.style.transition,
    }));
    for(const saved of savedTextStyles){
      saved.el.style.transition="none";
    }
    function consumeOriginalText(p:number){
      // Keep secondary text legible while the storm gathers, then strip
      // it away along with the moving grains instead of an early fade.
      const opacity=1-ease((p-.28)/.67);
      for(const saved of savedTextStyles){
        // The heading survives the automatic opening: it only dissolves
        // when the viewer taps through the first three voyage steps.
        saved.el.style.opacity=saved.el.matches("h1")?"1":String(opacity);
      }
    }
    // Punch out ONLY the actual heading ink from the darkening veil.
    // The real DOM glyphs remain underneath; there is no blue rectangular
    // patch around the title and no second oversized text overlay.
    let peelHeadingMask:HTMLCanvasElement|null=null;
    let peelHeadingBox:{x:number;y:number;w:number;h:number}|null=null;
    function updatePeelHeadingMask(){
      if(!titleSpan)return;
      const bounds=titleSpan.getBoundingClientRect();
      if(bounds.width<1||bounds.height<1)return;
      const font=getComputedStyle(titleSpan);
      const fs=parseFloat(font.fontSize)||32;
      const tracking=parseFloat(font.letterSpacing)||0;
      const mask=document.createElement("canvas");
      mask.width=Math.ceil(bounds.width+12);
      mask.height=Math.ceil(bounds.height+12);
      const mc=mask.getContext("2d");
      if(!mc)return;
      mc.font=font.fontWeight+" "+font.fontSize+" "+font.fontFamily;
      mc.textBaseline="middle";
      mc.fillStyle="#ffffff";
      let x=6;
      for(const char of titleLabel){
        mc.fillText(char,x,mask.height*.5);
        x+=mc.measureText(char).width+tracking;
      }
      peelHeadingMask=mask;
      peelHeadingBox={x:bounds.left-6,y:bounds.top-6,
        w:mask.width,h:mask.height};
    }

    // Background pigment is consumed as individual microscopic flecks
    // across the WHOLE page. The stable sub-pixel noise never moves as
    // a rectangle, closing shutter, radial vignette or blotchy square patch.
    // A cached, modest-resolution mask keeps the mobile render affordable.
    let absorptionMask:HTMLCanvasElement|null=null;
    let absorptionPixels:ImageData|null=null;
    let absorptionThresholds:Uint8Array|null=null;
    let absorptionStage=-1;
    function prepareAbsorptionMask(){
      const scale=Math.min(1,780/Math.max(1,viewWidth));
      const w=Math.max(2,Math.ceil(viewWidth*scale));
      const h=Math.max(2,Math.ceil(viewHeight*scale));
      if(absorptionMask && absorptionMask.width===w &&
        absorptionMask.height===h && absorptionPixels &&
        absorptionThresholds)return;
      const mask=document.createElement("canvas");
      mask.width=w;mask.height=h;
      const m=mask.getContext("2d");
      if(!m)return;
      const pixels=m.createImageData(w,h);
      const thresholds=new Uint8Array(w*h);
      // Individual flecks vanish at different moments. A small amount
      // of low-frequency variation suggests uneven weathered material,
      // but no visible coarse patches or four-sided wall closing.
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const idx=y*w+x;
        const nx=(x+.5)/w,ny=(y+.5)/h;
        const radial=Math.hypot(nx-origin.x/viewWidth,
          ny-origin.y/viewHeight);
        const grain=Math.random();
        const turbulence=.032*Math.sin(x*.101+y*.076)*
          Math.cos(y*.083-x*.047);
        const fading=clamp(grain+turbulence-.045*radial,0,1);
        thresholds[idx]=Math.round(fading*255);
        const i=idx*4;
        pixels.data[i]=0;
        pixels.data[i+1]=2;
        pixels.data[i+2]=9;
        pixels.data[i+3]=0;
      }
      absorptionMask=mask;
      absorptionPixels=pixels;
      absorptionThresholds=thresholds;
      absorptionStage=-1;
    }
    function peelBackground(amount:number,titleVisibility:number){
      if(amount<=0)return;
      const p=clamp(amount,0,1);
      ctx!.save();
      prepareAbsorptionMask();
      if(absorptionMask&&absorptionPixels&&absorptionThresholds){
        // Quantize only the mask update, not the moving sand animation.
        // Each ~1px grain keeps its assigned release threshold stable.
        const stage=p>=.995?256:Math.floor(p*255);
        if(stage!==absorptionStage){
          const data=absorptionPixels.data;
          const thresholds=absorptionThresholds;
          for(let i=0;i<thresholds.length;i++){
            const difference=stage-thresholds[i];
            const alpha=stage===256?255:
              difference<=-11?0:difference>=11?255:
              Math.round((difference+11)*(255/22));
            data[i*4+3]=alpha;
          }
          absorptionMask.getContext("2d")!.putImageData(absorptionPixels,0,0);
          absorptionStage=stage;
        }
        ctx!.imageSmoothingEnabled=true;
        ctx!.drawImage(absorptionMask,0,0,viewWidth,viewHeight);
      }else{
        // Browser fallback: never use edge-closing masks.
        ctx!.fillStyle="rgba(0,2,9,"+p.toFixed(3)+")";
        ctx!.fillRect(0,0,viewWidth,viewHeight);
      }
      // The MIAV title still belongs to the ORIGINAL page. Its actual
      // glyph stencil remains untouched until the later title taps.
      if(titleVisibility>0 && peelHeadingMask && peelHeadingBox){
        ctx!.globalCompositeOperation="destination-out";
        ctx!.globalAlpha=clamp(titleVisibility,0,1);
        ctx!.drawImage(peelHeadingMask,
          peelHeadingBox.x,peelHeadingBox.y);
      }
      ctx!.restore();
    }

    function drawPreRupturePeel(now:number){
      const p=reduced?1:clamp((now-(opened-PEEL_MS))/PEEL_MS,0,1);
      // The real navigation, strapline and descriptive text retreat as
      // sand; the MIAV title alone is left completely intact.
      consumeOriginalText(p);
      peelBackground(p,1);
      ctx!.save();
      for(const grain of peelDust){
        const t=(p-grain.born)/grain.duration;
        if(t<=0||t>=1)continue;
        const travel=ease(t);
        // Each speck follows an independently curving flight from a real
        // letter or a random patch of the blue background to the galaxy.
        const bend=grain.curl*Math.sin(Math.PI*travel);
        const x=grain.x+grain.dx*travel+grain.acrossX*bend+
          Math.sin(grain.phase+t*14)*2*(1-t);
        const y=grain.y+grain.dy*travel+grain.acrossY*bend+
          Math.cos(grain.phase+t*11)*2*(1-t);
        const light=ease(t/.065)*(1-ease((t-.91)/.09));
        if(light<=.01)continue;
        const alpha=grain.alpha*light;
        // Brighter individual white and icy-blue sand dots. Never draw
        // lines, long tails, glowing balls or a radial-spoke pattern.
        ctx!.fillStyle=grain.fromText
          ?"rgba(255,251,245,"+alpha.toFixed(3)+")"
          :"rgba(170,202,239,"+(alpha*.92).toFixed(3)+")";
        const size=grain.radius*(1-.36*travel);
        ctx!.fillRect(x,y,size,size);
      }
      ctx!.restore();
      // Keep the existing glass and its movement. This NEW foreground
      // pass is placed AFTER it so the white sand is actually visible
      // outside the globe instead of disappearing behind the glass layer.
      drawGlass(origin.x,origin.y,origin.radius,now);
      ctx!.save();
      for(const g of whiteStorm){
        const t=(p-g.start)/g.duration;
        if(t<=0||t>=1)continue;
        const u=ease(t);
        const curve=g.bend*Math.sin(Math.PI*u);
        const flicker=Math.sin(g.phase+t*12)*1.7*(1-u);
        const x=g.x+g.vx*u+g.sideX*(curve+flicker);
        const y=g.y+g.vy*u+g.sideY*(curve+flicker);
        if(x<0||y<0||x>=viewWidth||y>=viewHeight)continue;
        const visibility=ease(t/.045)*(1-ease((t-.92)/.08));
        if(visibility<.02)continue;
        // Independent sub-pixel WHITE sand grains, never streaks, rods,
        // halos or circular light effects. Sources cover every direction.
        const alpha=g.opacity*visibility;
        ctx!.fillStyle="rgba(255,255,250,"+alpha.toFixed(3)+")";
        const grainSize=g.size*(1-.24*u);
        ctx!.fillRect(x,y,grainSize,grainSize);
      }
      ctx!.restore();
    }

    const flightScene = createGalaxyFlightScene();
    const clusterOrb = createGalaxyClusterOrb();

    function resize() {
      viewWidth = window.innerWidth;
      viewHeight = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      canvas!.width = Math.round(viewWidth * dpr);
      canvas!.height = Math.round(viewHeight * dpr);
      canvas!.style.width = viewWidth + "px";
      canvas!.style.height = viewHeight + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      titleBase=null;titleEroded=null;titleEdgeRank=null;
      titleOriginalPixels=null;titleErosionFrame=-1;
      updatePeelHeadingMask();
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
      // Glass is transparent: the edge refracts light, but it is NOT a
      // thick circular hole filled with an opaque navy background.
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.beginPath();ctx!.arc(0, 0, r, 0, TAU);ctx!.clip();
      const translucent = ctx!.createRadialGradient(
        -r * 0.43, -r * 0.48, r * 0.06, r * 0.24, r * 0.21, r * 1.25);
      translucent.addColorStop(0, "rgba(72,123,176,0.18)");
      translucent.addColorStop(0.67, "rgba(41,74,116,0.085)");
      translucent.addColorStop(1, "rgba(11,22,42,0.20)");
      ctx!.fillStyle = translucent;
      ctx!.fillRect(-r,-r,2*r,2*r);
      ctx!.save();
      ctx!.globalCompositeOperation = "screen";
      // The glass holds a 3D-turning spiral with no rectangular JPEG sky.
      const spiral = isolatedSpiral(globe);
      if (spiral) {
        const yaw = Math.sin(now * .00017) * .55;
        const pitch = Math.sin(now * .00013 + .5) * .42;
        const roll = now * .000095;
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        const cr = Math.cos(roll), sr = Math.sin(roll);
        ctx!.transform(cr*cy-sr*sp*sy, sr*cy+cr*sp*sy, -sr*cp, cr*cp, 0, 0);
        ctx!.drawImage(spiral,-r*.78,-r*.78,r*1.56,r*1.56);
      }
      ctx!.restore();
      const shine = ctx!.createRadialGradient(
        -r*.46,-r*.55,0,-r*.46,-r*.55,r*.24);
      shine.addColorStop(0,"rgba(244,253,255,.90)");
      shine.addColorStop(.18,"rgba(177,224,255,.55)");
      shine.addColorStop(1,"rgba(137,201,250,0)");
      ctx!.fillStyle=shine;ctx!.fillRect(-r,-r,2*r,2*r);
      ctx!.restore();
      // Two barely visible refraction strokes, with a stronger short upper
      // highlight; no opaque thick unbroken metal-looking border.
      ctx!.save();
      ctx!.strokeStyle="rgba(168,217,248,.26)";
      ctx!.lineWidth=Math.min(1.2,Math.max(.55,r*.0038));
      ctx!.beginPath();ctx!.arc(x,y,r-.7,0,TAU);ctx!.stroke();
      ctx!.strokeStyle="rgba(232,249,255,.44)";
      ctx!.lineWidth=Math.max(.5,Math.min(.95,r*.0028));
      ctx!.beginPath();ctx!.arc(x,y,r-.75,Math.PI*1.12,Math.PI*1.60);ctx!.stroke();
      ctx!.restore();
    }

    function drawGlassPerimeterGrains(now: number, cx: number, cy: number,
      radius: number, fading: number) {
      if(fading<=.005)return;
      const p=clamp((now-opened)/IMPLOSION_MS,0,1);
      // Glass skin scatters into independent irregular pinpricks. No
      // rotating spokes, uniform rings or fan-blade-shaped tracks.
      ctx!.save();
      for(let i=0;i<670;i++){
        const seed=((Math.imul(i+31,2654435761)>>>0)/4294967295);
        const angle=TAU*((i*.618033988749895+seed*.21)%1);
        const delay=.31+seed*.39;
        const t=clamp((p-delay)/(1-delay),0,1);
        if(t<=0||t>=1)continue;
        const a=ease(t);
        const sx=cx+Math.cos(angle)*radius*(.973+.045*seed);
        const sy=cy+Math.sin(angle)*radius*(.973+.045*seed);
        const vibration=(1-a)*Math.sin(t*(13+seed*9)+i*.73)*
          Math.sin(t*Math.PI)*radius*.035;
        const x=sx+(cx-sx)*a+Math.cos(angle*2.1+seed*4)*vibration;
        const y=sy+(cy-sy)*a+Math.sin(angle*1.7+seed*6)*vibration;
        const alpha=fading*(.16+.38*seed)*Math.sin(Math.PI*t);
        if(alpha<.025)continue;
        ctx!.fillStyle="rgba(218,233,247,"+alpha.toFixed(3)+")";
        const r=.085+seed*.24;
        ctx!.fillRect(x,y,r,r);
      }
      ctx!.restore();
    }

    function drawSand(now: number, cx: number, cy: number, amount: number) {
      if (amount <= .001) return;
      // Fine, irregular, LETTER-SOURCED dust -- not 11 radial blades.
      // Every speck has its own release instant, turbulence, curl and
      // lifetime. There is no repeating group wave or rotating fan pattern.
      const passed=clamp((now-opened)/IMPLOSION_MS,0,1);
      ctx!.save();
      for(const grain of dust){
        const local=(passed-grain.delay)*grain.speed/
          Math.max(.19,1-grain.delay);
        if(local<=0||local>=1)continue;
        const t=clamp(local,0,1);
        const travel=ease(t);
        const dx=cx-grain.x,dy=cy-grain.y;
        const length=Math.max(6,Math.hypot(dx,dy));
        const sideways=Math.sin(Math.PI*t);
        const slowNoise=Math.sin(t*(6.3+grain.speed*2.1)+grain.phase);
        const fastNoise=Math.sin(t*25+grain.wobble);
        const chaotic=grain.drift*(.30*slowNoise+.18*fastNoise)*
          sideways*(.70+.30*(1-t));
        const x=grain.x+dx*travel+(-dy/length)*chaotic+
          2.3*Math.sin(t*31+grain.phase*2.4)*(1-t);
        const y=grain.y+dy*travel+(dx/length)*chaotic+
          1.8*Math.cos(t*29+grain.wobble)*(1-t);
        const fadeIn=ease(t/.095);
        const fadeOut=1-ease((t-.67)/.32);
        const alpha=amount*grain.brightness*fadeIn*fadeOut*
          (.73+.27*Math.sin(grain.phase+t*39)**2);
        if(alpha<.025)continue;
        const size=Math.max(.075,grain.radius*(1-.56*t));
        ctx!.fillStyle=grain.phase>3.8
          ? "rgba(205,223,248,"+Math.min(.86,alpha).toFixed(3)+")"
          : "rgba(246,240,230,"+Math.min(.86,alpha).toFixed(3)+")";
        ctx!.fillRect(x,y,size,size);
      }
      ctx!.restore();
    }

    function drawImplosion(now: number) {
      const age=now-opened;
      const p=reduced?1:clamp(age/IMPLOSION_MS,0,1);
      const glide=ease(p);
      const cx=mix(origin.x,viewWidth*.51,glide);
      const cy=mix(origin.y,viewHeight*.52,glide);
      const short=Math.min(viewWidth,viewHeight);
      // The blue site and secondary copy have ALREADY been absorbed for
      // three seconds. Keep them gone while the ORIGINAL glass breaks.
      consumeOriginalText(1);
      peelBackground(1,1-ease((p-.73)/.27));
      // Crossfade the same-size glyphs in their ORIGINAL page position
      // while the DOM stencil is being covered by the space background.
      // There is never a gap or a second title entering elsewhere.
      drawRemainingTitle(now,ease((p-.73)/.27));
      const glassOpacity=1-ease((p-.60)/.37);
      if(glassOpacity>.002){
        ctx!.save();
        ctx!.globalAlpha=glassOpacity;
        drawGlass(cx,cy,origin.radius*(1+.045*glide),now);
        ctx!.restore();
      }
      // Galaxy continues moving out of its glass shell; its size and
      // position carry seamlessly into the starless voyage start.
      galaxyImage(first.complete&&first.naturalWidth?first:globe,
        cx,cy,mix(origin.radius*1.48,short*.86,glide),
        firstRotation,.32+.68*ease((p-.38)/.50));
      drawGlassPerimeterGrains(now,cx,cy,
        origin.radius*(1+.04*glide),1-ease((p-.48)/.48));
      // Draw sand AFTER the dark overlay so the grains are visible until
      // they actually enter the galaxy, instead of vanishing into the dark.
      drawSand(now,cx,cy,(.29+.71*ease((p-.07)/.24))*
        (1-ease((p-.84)/.15)));
    }

    function titleErosion(now:number) {
      // 1st tap: a recognisable heading with a few missing fragments.
      // 2nd: heavily weathered, but still readable.
      // 3rd: slow, complete disintegration. No instant puff.
      const stage=Math.min(3,target);
      // The heading was already partially washed out inside the last
      // glass orb. Never restore an undamaged full-strength copy at the
      // first post-glass tap: erosion continues from that retained state.
      if(stage===0)return .11;
      const from=[0,.11,.22,.40][stage];
      const to=[0,.22,.40,1][stage];
      const ms=[0,1450,1700,4850][stage];
      return mix(from,to,ease((now-titleTapStartedAt)/ms));
    }

    function drawRemainingTitle(now:number, entering=1) {
      if(target>=4)return;
      prepareTitle();
      if(!titleBase||!titleEroded)return;
      const fraction=titleErosion(now);
      const frame=Math.floor(fraction*190);
      if(frame!==titleErosionFrame){
        const b=titleEroded.getContext("2d");
        if(!b||!titleOriginalPixels||!titleEdgeRank)return;
        const data=b.createImageData(titleEroded.width,titleEroded.height);
        data.data.set(titleOriginalPixels);
        for(let i=0;i<titleEdgeRank.length;i++){
          const rank=titleEdgeRank[i]/255;
          const surviving=ease((rank-fraction)/.085);
          data.data[i*4+3]=Math.round(data.data[i*4+3]*surviving);
        }
        b.clearRect(0,0,titleEroded.width,titleEroded.height);
        b.putImageData(data,0,0);
        titleErosionFrame=frame;
      }
      const pos=titleOrigin();
      ctx!.save();
      // Tap two becomes an almost translucent, fragile ivory-white.
      // Do not mistake this subdued opacity for the erosion itself:
      // the silhouette above has actually lost material at its edges.
      // The material, not a UI alpha fade, is what disappears. On tap 3
      // its last surviving strokes also become almost transparent.
      // Keep the same semi-transparent title carried out of the glass.
      // Previously target 0 and target 1 jumped to opacity 1, making a
      // bright intact title reappear when the visitor clicked.
      const retained=.52;
      const faded=target===2?mix(retained,.35,ease((now-titleTapStartedAt)/1700)):
        target===3?mix(.35,0,ease((now-titleTapStartedAt)/4850)):
        retained;
      ctx!.globalAlpha=faded*entering;
      ctx!.shadowColor="rgba(204,226,255,.045)";
      ctx!.shadowBlur=.5;
      ctx!.drawImage(titleEroded,pos.x,pos.y);
      ctx!.restore();
    }

    function drawRemainingTitleDust(now:number,cx:number,cy:number){
      if(target===0||target>=4)return;
      prepareTitle();
      if(!titleBase)return;
      const pos=titleOrigin();
      const stage=Math.min(target,3);
      const age=Math.max(0,now-titleTapStartedAt);
      ctx!.save();
      for(let i=0;i<titleParticles.length;i++){
        const grain=titleParticles[i];
        if(grain.band>stage)continue;
        // Previously lost material is mostly gone; a few remaining specks
        // keep peeling from the broken tips rather than the same line forever.
        if(grain.band<stage && i%4!==0)continue;
        let t:number;
        if(stage===3){
          // A last, staggered outflow over the same unmodified 4.85 seconds
          // used by the final erosion. No sudden explosion or straight rays.
          const travelMs=2400+1300*(.5+.5*Math.sin(grain.phase*3.17));
          t=(age-grain.delay*1650)/travelMs;
        }else{
          // Trickle continuously while the visitor pauses between taps.
          const period=2050+850*(.5+.5*Math.sin(grain.phase*2.17));
          t=((age+grain.delay*period)/period)%1;
        }
        if(t<=0||t>=1)continue;
        const u=ease(t);
        const sx=pos.x+grain.x,sy=pos.y+grain.y;
        const dx=cx-sx,dy=cy-sy;
        const d=Math.max(1,Math.hypot(dx,dy));
        const curl=grain.bend*Math.sin(Math.PI*u);
        // Each grain curls and meanders through space before being swallowed.
        const eddy=Math.sin(t*12+grain.phase)*5*Math.sin(Math.PI*t);
        const x=sx+dx*u-dy/d*(curl+eddy);
        const y=sy+dy*u+dx/d*(curl+eddy);
        if(x<0||x>=viewWidth||y<0||y>=viewHeight)continue;
        const fade=ease(t/.075)*(1-ease((t-.85)/.15));
        const alpha=fade*(.74+.26*Math.sin(grain.phase+t*13)**2);
        if(alpha<.025)continue;
        ctx!.fillStyle="rgba(255,255,251,"+alpha.toFixed(3)+")";
        const size=grain.radius*(1-.37*u);
        ctx!.fillRect(x,y,size,size);
      }
      ctx!.restore();
    }

    // After tap 3, the freed white grains wander on irregular, curved
    // paths around the SAME galaxy before spiralling in. Nothing changes
    // its source image, rotation, trajectory or the later planetary voyage.
    const wanderingSand=Array.from({length:2400},(_,i)=>({
      phase:Math.random()*TAU,
      angle:Math.random()*TAU,
      orbit:.37+Math.random()*.40,
      period:2450+Math.random()*3700,
      delay:Math.random(),
      curl:(Math.random()-.5)*.75,
      wobble:Math.random()*TAU,
      radius:.42+Math.random()*.40,
      alpha:.66+Math.random()*.34,
      side:i%2===0?1:-1,
    }));
    function drawWanderingSand(now:number,step:number){
      if(sandSuctionStartedAt!==null){
        const elapsed=now-sandSuctionStartedAt;
        if(elapsed>=1150)return;
        const cx=viewWidth*.51,cy=viewHeight*.52;
        const short=Math.min(viewWidth,viewHeight);
        ctx!.save();
        for(const g of wanderingSand){
          // Recover the precise drifting position at the fourth tap so the
          // sweep is continuous rather than a new cloud appearing.
          const t=((sandSuctionStartedAt-opened+g.delay*g.period)%g.period)/g.period;
          const inward=ease(t);
          const radius=short*(g.orbit*(1-inward*.90)+
            .045*Math.sin(t*11+g.phase)*Math.sin(Math.PI*t));
          const angle=g.angle+g.side*(1.5+g.curl)*inward+
            .33*Math.sin(t*8+g.wobble)*Math.sin(Math.PI*t);
          const px=cx+Math.cos(angle)*radius;
          const py=cy+Math.sin(angle)*radius*.80;
          const wait=g.delay*150;
          const u=ease((elapsed-wait)/(690+g.period*.035));
          if(u<=0||u>=1)continue;
          const curl=Math.sin(Math.PI*u)*g.side*(18+35*g.orbit);
          const x=px+(cx-px)*u+Math.cos(angle+Math.PI*.5)*curl;
          const y=py+(cy-py)*u+Math.sin(angle+Math.PI*.5)*curl;
          if(x<0||x>=viewWidth||y<0||y>=viewHeight)continue;
          const alpha=g.alpha*(1-ease((u-.78)/.22));
          ctx!.fillStyle="rgba(255,255,253,"+alpha.toFixed(3)+")";
          const size=g.radius*(1-.42*u);
          ctx!.fillRect(x,y,size,size);
        }
        ctx!.restore();
        return;
      }
      if(step<2||step>3)return;
      // Starts gathering during tap 2 and swells into an uneven sand cloud
      // on the third tap; it gradually fades as stars are revealed later.
      const stage=Math.min(3,target);
      const fade=step<=3?1:1-ease((step-3)/6);
      const max=stage===2?470:stage===3?2300:100;
      const short=Math.min(viewWidth,viewHeight);
      const cx=viewWidth*.51,cy=viewHeight*.52;
      ctx!.save();
      for(let i=0;i<max;i++){
        const g=wanderingSand[i];
        const t=((now-opened+g.delay*g.period)%g.period)/g.period;
        const inward=ease(t);
        // Sweep around the nucleus, with unequal radial lengths and
        // fluctuating directions: no uniform Saturn ring or rotating spokes.
        const radius=short*(g.orbit*(1-inward*.90)+
          .045*Math.sin(t*11+g.phase)*Math.sin(Math.PI*t));
        const angle=g.angle+g.side*(1.5+g.curl)*inward+
          .33*Math.sin(t*8+g.wobble)*Math.sin(Math.PI*t);
        const x=cx+Math.cos(angle)*radius;
        const y=cy+Math.sin(angle)*radius*.80;
        if(x<0||x>=viewWidth||y<0||y>=viewHeight)continue;
        const alpha=g.alpha*fade*ease(t/.07)*
          (1-ease((t-.87)/.13))*(.82+.18*Math.sin(now*.003+g.phase)**2);
        if(alpha<.025)continue;
        ctx!.fillStyle="rgba(255,255,253,"+alpha.toFixed(3)+")";
        ctx!.fillRect(x,y,g.radius*(1-.27*inward),g.radius*(1-.27*inward));
      }
      ctx!.restore();
    }

    function drawGalaxy3D(img: HTMLImageElement, x: number, y: number, diameter: number,
      phase: number, alpha: number, depth = 1, foregroundOcclusion = false) {
      if (diameter < 1 || alpha <= 0.002) return;
      const texture = img === globe ? isolatedSpiral(globe) : preparedGalaxy(img);
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
      // On the typography pass let galactic dust partially cover the glyphs:
      // it should read as letters BEHIND the star clouds, not white UI drawn
      // on top of a picture. Ordinary galaxy rendering keeps screen blending.
      ctx!.globalCompositeOperation = foregroundOcclusion ? "source-over" : "screen";
      ctx!.drawImage(texture, -radius, -radius, diameter, diameter);
      ctx!.restore();
      ctx!.restore();
    }


    function draw(now: number, dt: number) {
      if (!running) return;
      ctx!.clearRect(0, 0, viewWidth, viewHeight);
      const age = now - opened;
      const short = Math.min(viewWidth, viewHeight);
      // Pre-rupture: 3 seconds of absorbing page text and blue pigment.
      // Only after that do the existing glass and galaxy steps start.
      if(age<0){drawPreRupturePeel(now);return;}
      if (age < IMPLOSION_MS) { drawImplosion(now); return; }
      consumeOriginalText(1);
      progress = mix(progress, target, reduced ? 1 : Math.min(1, dt / 205));
      if (Math.abs(progress - target) < 0.005) progress = target;
      const s = progress;
      // Keep the existing ~100 taps of planetary travel, then compress only
      // the huge intergalactic distances into a manageable number of taps.
      // All scenes share this camera distance; none are timed slide changes.
      const sceneStep = s <= 100 ? s
        : s <= 160 ? 100 + (s - 100) * 3
        : 280 + (s - 160) * 1.2;
      ctx!.fillStyle = "#01040c";
      ctx!.fillRect(0, 0, viewWidth, viewHeight);
      // Transparent galactic gas is BELOW its own orbiting stars. The camera
      // and star positions share the same distance: no stage picture swap.
      flightScene.drawGalaxy(ctx!, sceneStep, viewWidth, viewHeight, now);
      // The third tap finishes the title, leaving JUST the galaxy and
      // drifting sand. Stars begin revealing with the FOURTH tap and
      // accumulate and twinkle through the existing unchanged sky logic.
      if(s>4){
        ctx!.save();
        ctx!.globalAlpha=ease((s-4)/.92);
        flightScene.drawSky(ctx!, now, viewWidth, viewHeight, sceneStep);
        ctx!.restore();
      }
      if (finalReachedAt !== null && s >= FINAL_STEP - 0.08) {
        flightScene.drawFinalSparkles(ctx!, now - finalReachedAt, viewWidth, viewHeight);
      }

      // The larger, chipped title sits BEHIND the foreground galaxy for
      // three taps. Its missing fragments depart from all parts of the text.
      drawRemainingTitle(now);
      // Each phase advances ONLY on user tap: 3 title taps, faint stars,
      // close planetary passes, galaxy edge/half/exit, then the glass orb.
      const recession = Math.max(0, s - 3);
      const firstSize = short * 0.86 * Math.pow(0.855, Math.min(FIRST_STAR_STEP - 3, recession));
      if (!reduced && firstSize > short * 0.10) firstRotation += dt * 0.000175;
      const firstTexture = first.complete && first.naturalWidth ? first : globe;
      const firstOpacity = 1 - ease((s - FIRST_STAR_STEP + 2) / 5);
      if (s < FIRST_PLANET_STEP) {
        drawGalaxy3D(firstTexture, viewWidth * 0.51, viewHeight * 0.52,
          firstSize, firstRotation, firstOpacity, 0.2);
      } else if (s < 112) {
        ctx!.fillStyle = "rgba(235,209,255,0.42)";
        ctx!.beginPath();
        ctx!.arc(viewWidth * 0.51, viewHeight * 0.52, 0.7, 0, TAU);
        ctx!.fill();
      }
      // Foreground grains must not disappear behind the bright galaxy
      // texture, which was why the eroded lettering looked like a fade.
      drawRemainingTitleDust(now,viewWidth*.51,viewHeight*.52);
      drawOrbitSand(now,s);
      drawWanderingSand(now,s);

      // The original title still sits behind the galaxy; only its
      // released grains can pass across the foreground until swallowed.

      // Planets remain off-axis in the same sky throughout the pull-back.
      flightScene.drawForeground(ctx!, sceneStep, viewWidth, viewHeight, now);
      // Other galaxies resolve along the receding upper-right sightline.
      // The sphere boundary emerges later, enclosing those same galaxies.
      clusterOrb.draw(ctx!, viewWidth, viewHeight, s, now,
        finalReachedAt === null ? null : now - finalReachedAt);
    }

    function stepForward() {
      const now = performance.now();
      if (now - lastAdvanceAt < 150 || now - opened < IMPLOSION_MS - 80) return;
      // Finish each title stage before allowing the next one. The final
      // explosion takes nearly five seconds, and cannot be skipped by
      // rapidly tapping through an unfinished letter disintegration.
      if(target>0&&target<3&&now-titleTapStartedAt<900)return;
      if(target===3&&now-titleTapStartedAt<4850)return;
      // Keep tap four on screen until the scattered dust has been
      // swallowed; rapidly tapping cannot skip the one-time event.
      if(target===4&&sandSuctionStartedAt!==null&&
         now-sandSuctionStartedAt<1150)return;
      lastAdvanceAt = now;
      // The last orb is a contemplative scene, not a tap-to-exit button.
      // Only the existing spaceship control (or Escape) returns home early.
      if (target >= FINAL_STEP) return;
      target += 1;
      // Play only when a step genuinely advances; blocked rapid taps are silent.
      playGalaxyCue(
        target===FINAL_STEP ? "arrival" :
        target===4 ? "suction" :
        target<=3 ? "letter" : "space",
        target,
      );
      if(target===4)sandSuctionStartedAt=now;
      if(target<=3)titleTapStartedAt=now;
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      if (target >= FINAL_STEP) {
        finalReachedAt = now;
        // Continue drifting, rolling and absorbing fine stars for three
        // minutes regardless of more taps. Leave the safety idle timeout
        // disabled while here; the dedicated spaceship remains available.
        // Afterwards return to the actual home without a title overlay.
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
      for(const saved of savedTextStyles){
        saved.el.style.opacity=saved.opacity;
        saved.el.style.transition=saved.transition;
      }
      cancelAnimationFrame(frame);
      if (finalTimer !== undefined) clearTimeout(finalTimer);
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      window.clearTimeout(ruptureTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keydown);
    };
  }, [origin.x, origin.y, origin.radius]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tap to travel through stars and planets, then discover galaxies inside a drifting glass orb."
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
        aria-label={soundOn ? "Mute galaxy sound effects" : "Unmute galaxy sound effects"}
        aria-pressed={soundOn}
        title={soundOn ? "Sound on — tap to mute" : "Sound muted — tap to enable"}
        onClick={(event) => {
          event.stopPropagation();
          const next = !soundOn;
          setGalaxySoundEnabled(next);
          setSoundOn(next);
        }}
        className="absolute right-3 top-3 rounded-full border border-white/20 bg-[#071426]/65 px-3 py-2 text-[0.65rem] tracking-[0.12em] text-white/75 backdrop-blur-sm hover:border-sky-200/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        style={{ zIndex: 2 }}
      >
        {soundOn ? "SOUND ON" : "SOUND OFF"}
      </button>
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
