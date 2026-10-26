"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GALAXY } from "./GalaxyHeading";
import { drawStage1EntryCraft } from "./drawStage1EntryCraft";
import { createGalaxyFlightScene } from "./GalaxyFlightScene";
import { createGalaxyClusterOrb } from "./GalaxyClusterOrb";
import { isolatedSpiral } from "./isolatedSpiral";

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
const IMPLOSION_MS = 2650;
const FINAL_HOLD_MS = 180_000;
const IDLE_MS = 120_000;

function sampleTextLocations(): Point[] {
  // Sample visible individual GLYPHS, not the bounding rectangle of a whole
  // paragraph. Rectangular random sources looked like evenly spread static.
  // Include top navigation as well as all visible hero lettering, rather
  // than releasing dust only from the lower half of the mobile screen.
  const points: Point[] = [];
  const elements = document.querySelectorAll(
    "header a, header button, header span, main section:first-of-type h1, " +
    "main section:first-of-type p, main section:first-of-type nav a, " +
    "main section:first-of-type aside span"
  );
  const range = document.createRange();
  for (const el of elements) {
    if (points.length >= 1200) break;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode()) !== null && points.length < 1200) {
      const text = node.textContent ?? "";
      for (let i=0;i<text.length && points.length<1200;i++) {
        if (!text[i].trim()) continue;
        if (Math.random() > .68) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || r.right < 0 ||
            r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
        const count = Math.random() < .34 ? 2 : 1;
        for (let n=0;n<count;n++) {
          points.push({
            x:r.left+r.width*(.12+.76*Math.random()),
            y:r.top+r.height*(.26+.55*Math.random()),
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

    // The NASA images really are telescope observations. They are composited
    // as an artistic journey, not as an accurate atlas of galaxy positions.
    const globe = new Image();
    globe.src = GALAXY;
    const first = new Image();
    first.src = NASA_M100;
    const prepared = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
    const selectedText = sampleTextLocations();
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
    type TitleParticle={x:number;y:number;delay:number;radius:number;bend:number;phase:number};
    type Hole={x:number;y:number;radius:number};
    let titleBase:HTMLCanvasElement|null=null;
    let titleEroded:HTMLCanvasElement|null=null;
    let titleHoles:Hole[]=[];
    let titleParticles:TitleParticle[]=[];
    let titleErosionFrame=-1;
    // Render the heading as a large TRUE glyph mask. Removing pieces of
    // these glyphs is fundamentally different from fading the text layer.
    function prepareTitle() {
      if(titleBase&&titleEroded)return;
      const maxWidth=Math.max(120,viewWidth*.94);
      const weight=titleStyle?.fontWeight||"500";
      const family=titleStyle?.fontFamily||'Georgia, "Yu Mincho", serif';
      const probe=document.createElement("canvas").getContext("2d");
      if(!probe)return;
      let fontSize=Math.min(88,Math.max(52,viewWidth*.20));
      for(let trial=0;trial<18;trial++){
        probe.font=weight+" "+fontSize+"px "+family;
        if(probe.measureText(titleLabel).width<=maxWidth-8)break;
        fontSize*=.94;
      }
      probe.font=weight+" "+fontSize+"px "+family;
      const width=Math.min(viewWidth*.97,probe.measureText(titleLabel).width+12);
      const base=document.createElement("canvas");
      base.width=Math.ceil(width);base.height=Math.ceil(fontSize*1.62);
      const b=base.getContext("2d",{willReadFrequently:true});
      if(!b)return;
      b.font=probe.font;b.textAlign="center";b.textBaseline="middle";
      b.fillStyle="rgba(251,245,235,1)";
      b.fillText(titleLabel,base.width*.5,base.height*.53);
      const mask=b.getImageData(0,0,base.width,base.height).data;
      const pixels:Point[]=[];
      for(let y=1;y<base.height-1;y+=2){
        for(let x=1;x<base.width-1;x+=2){
          if(mask[(y*base.width+x)*4+3]>125)pixels.push({x,y});
        }
      }
      if(!pixels.length)return;
      // Stable randomized erosion across ALL letters, not a horizontal
      // wipe or uniformly dissolving opacity. Cache the cuts during pauses.
      titleHoles=Array.from({length:3700},(_,n)=>{
        const p=pixels[Math.floor(Math.random()*pixels.length)];
        return {x:p.x+(Math.random()-.5)*3,
          y:p.y+(Math.random()-.5)*3,
          radius:.75+Math.pow(Math.random(),.7)*3.0};
      });
      titleParticles=Array.from({length:3600},(_,n)=>{
        const p=pixels[Math.floor(Math.random()*pixels.length)];
        return {x:p.x+(Math.random()-.5)*3,
          y:p.y+(Math.random()-.5)*3,
          delay:Math.random()*.77,
          radius:.24+Math.random()*.76,
          bend:(Math.random()-.5)*84,phase:Math.random()*TAU};
      });
      titleBase=base;titleEroded=document.createElement("canvas");
      titleEroded.width=base.width;titleEroded.height=base.height;
      titleErosionFrame=-1;
    }
    function titleOrigin(){
      if(!titleBase)return {x:0,y:0};
      return {x:(viewWidth-titleBase.width)*.5,
        y:(viewHeight-titleBase.height)*.5};
    }
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
        radius:.17+Math.random()*.57,
        brightness:.38+Math.random()*.62
      };
    });
    // The original DOM text remains visible until it is consumed. Fade it
    // WHILE sand is departing. Preserve exact inline styles for the return.
    const section=document.querySelector("[data-galaxy-title]")?.closest("section");
    const textElements=Array.from(section?.querySelectorAll<HTMLElement>(
      "h1, p, nav a"
    )??[]).filter(el=>el.getBoundingClientRect().width>0);
    const savedTextStyles=textElements.map(el=>({
      el,opacity:el.style.opacity,transition:el.style.transition,
    }));
    for(const saved of savedTextStyles){
      saved.el.style.transition="none";
    }
    function consumeOriginalText(p:number){
      const opacity=1-ease((p-.16)/.74);
      for(const saved of savedTextStyles){
        // The heading survives the automatic opening: it only dissolves
        // when the viewer taps through the first three voyage steps.
        saved.el.style.opacity=saved.el.matches("h1")?"1":String(opacity);
      }
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
      titleBase=null;titleEroded=null;titleErosionFrame=-1;
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
        const r=.20+seed*.50;
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
        const size=Math.max(.12,grain.radius*(1-.56*t));
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
      // The actual homepage letters still exist during this phase. They
      // erode ONLY NOW and NEVER return as a second canvas-generated title.
      consumeOriginalText(p);

      // FIRST the real glyphs turn into fine dust. Only AFTER most letters
      // have disappeared do the glass and background fade into deep space.
      const darkness=ease((p-.56)/.44);
      if(darkness>0){
        ctx!.fillStyle="rgba(0,2,9,"+darkness.toFixed(4)+")";
        ctx!.fillRect(0,0,viewWidth,viewHeight);
      }
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
      if(stage===0)return 0;
      const from=[0,0,.22,.52][stage];
      const to=[0,.22,.52,1][stage];
      const ms=[0,1450,1700,4850][stage];
      return mix(from,to,ease((now-titleTapStartedAt)/ms));
    }

    function drawRemainingTitle(now:number) {
      if(target>=4)return;
      prepareTitle();
      if(!titleBase||!titleEroded)return;
      const fraction=titleErosion(now);
      const frame=Math.floor(fraction*190);
      if(frame!==titleErosionFrame){
        const b=titleEroded.getContext("2d");
        if(!b)return;
        b.clearRect(0,0,titleEroded.width,titleEroded.height);
        b.globalCompositeOperation="source-over";
        b.drawImage(titleBase,0,0);
        b.globalCompositeOperation="destination-out";
        const count=Math.floor(fraction<=.22
          ? fraction/.22*340
          : fraction<=.52
            ? 340+(fraction-.22)/.30*990
            : 1330+(fraction-.52)/.48*2370);
        b.fillStyle="#000";
        for(let i=0;i<Math.min(titleHoles.length,count);i++){
          const hole=titleHoles[i];
          b.beginPath();b.arc(hole.x,hole.y,hole.radius,0,TAU);b.fill();
        }
        b.globalCompositeOperation="source-over";
        if(fraction>=.997)b.clearRect(0,0,titleEroded.width,titleEroded.height);
        titleErosionFrame=frame;
      }
      const pos=titleOrigin();
      ctx!.save();ctx!.shadowColor="rgba(204,226,255,.13)";
      ctx!.shadowBlur=2;
      ctx!.drawImage(titleEroded,pos.x,pos.y);
      ctx!.restore();
    }

    function drawRemainingTitleDust(now:number,cx:number,cy:number){
      if(target===0||target>=4)return;
      prepareTitle();
      if(!titleBase)return;
      const pos=titleOrigin();
      const stage=Math.min(target,3);
      const stageAge=now-titleTapStartedAt;
      const final=stage===3;
      ctx!.save();
      for(let i=0;i<titleParticles.length;i++){
        const grain=titleParticles[i];
        let t:number;
        if(final) {
          // On the third tap each fragment makes one slow, final journey.
          // Delayed departures and varied speeds preserve a ragged cloud.
          t=(stageAge-grain.delay*1550)/
            (2500+1700*(.5+.5*Math.sin(grain.phase*3.17)));
        } else {
          // When paused at tap 1 or 2, the glyph continuously sheds fine
          // material. Do not freeze or leave static specks in mid-air.
          const period=1950+980*(.5+.5*Math.sin(grain.phase*2.17));
          t=((now-opened+grain.delay*period*3)/period)%1;
        }
        if(t<=0||t>=1)continue;
        const travel=ease(t);
        const sx=pos.x+grain.x,sy=pos.y+grain.y;
        const dx=cx-sx,dy=cy-sy;
        const length=Math.max(1,Math.hypot(dx,dy));
        const curl=grain.bend*Math.sin(Math.PI*t);
        const x=sx+dx*travel-dy/length*curl+
          2.2*Math.sin(t*11+grain.phase)*(1-t);
        const y=sy+dy*travel+dx/length*curl;
        const alpha=(1-ease((t-.77)/.23))*ease(t/.10)*
          (.42+.46*Math.sin(grain.phase+t*19)**2)*
          (final?1.0:stage===1?.66:.85);
        if(alpha<.023)continue;
        ctx!.fillStyle=grain.phase>Math.PI
          ?"rgba(208,230,255,"+alpha.toFixed(3)+")"
          :"rgba(255,242,223,"+alpha.toFixed(3)+")";
        const radius=grain.radius*(1-.60*t);
        ctx!.fillRect(x,y,radius,radius);
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
      // Consume the real homepage lettering before covering it in darkness.
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
      flightScene.drawSky(ctx!, now, viewWidth, viewHeight, sceneStep);
      if (finalReachedAt !== null && s >= FINAL_STEP - 0.08) {
        flightScene.drawFinalSparkles(ctx!, now - finalReachedAt, viewWidth, viewHeight);
      }

      // The larger, chipped title sits BEHIND the foreground galaxy for
      // three taps. Its missing fragments depart from all parts of the text.
      drawRemainingTitle(now);
      drawRemainingTitleDust(now,viewWidth*.51,viewHeight*.52);
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

      // The eroded heading and departing dust were drawn BEHIND the galaxy.

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
      lastAdvanceAt = now;
      // The last orb is a contemplative scene, not a tap-to-exit button.
      // Only the existing spaceship control (or Escape) returns home early.
      if (target >= FINAL_STEP) return;
      target += 1;
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
