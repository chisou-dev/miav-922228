"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  STAGE2_ISLANDS, STAGE2_ZOOMS, bearingTo, clamp, stage2FaceHeights,
  initialStage2Nav, islandDistance, signedBearing, stage2OutcomeText,
  stage2Visitors, stage2Wind, stepStage2, wrap360,
  type Stage2Input, type Stage2Island, type Stage2IslandId,
  type Stage2Nav,
} from "./reentryStage2Navigation";
import { ReentryAudioControl } from "./ReentryAudioControl";
import { drawEscapeSkiff } from "./reentryEscapeSkiff";
import { getReentryUserVolume } from "./reentryAudio";
import {
  resumeStage2CabinAudio,
  startStage2CabinAudio,
  stopStage2CabinAudio,
  updateStage2CabinAudio,
} from "./reentryStage2CabinAudio";

type People = Record<Stage2IslandId, boolean>;
const defaultPeople:People={japan:false,antarctic:true,visitor:false};
const baseKeys:Stage2Input={steerX:0,steerY:0,thrust:0};
const deg=Math.PI/180;
const ctrl="touch-none select-none rounded-lg border border-cyan-200/40 bg-[#092b39]/95 "+
  "text-cyan-50 font-mono font-semibold shadow-[0_3px_12px_rgba(0,0,0,0.35)] "+
  "active:bg-[#32778d] focus-visible:outline focus-visible:outline-2 "+
  "focus-visible:outline-cyan-100 disabled:opacity-35";

function drawFigure(ctx:CanvasRenderingContext2D,x:number,y:number,u:number,
  skin:string,hair:string,coat:string,polar=false,time=0):void {
  if(u<0.65){ctx.fillStyle=coat;ctx.fillRect(x-u/2,y-u/2,Math.max(1,u),Math.max(2,u*2));return;}
  ctx.save();ctx.translate(x,y+Math.sin(time*1.1)*u*0.01);
  ctx.fillStyle=coat;
  ctx.beginPath();ctx.moveTo(-u*.50,u*.55);ctx.lineTo(-u*.85,u*2.7);
  ctx.lineTo(u*.85,u*2.7);ctx.lineTo(u*.5,u*.55);ctx.fill();
  ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(0,0,u*.79,u*.95,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,u*.10,u*.69,u*.83,0,0,Math.PI*2);ctx.fill();
  if(polar){
    ctx.strokeStyle="#e8e9e3";ctx.lineWidth=Math.max(.7,u*.17);
    ctx.beginPath();ctx.ellipse(0,u*.10,u*.71,u*.88,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.strokeStyle="rgba(62,39,32,0.6)";ctx.lineWidth=Math.max(.45,u*.027);
  ctx.beginPath();ctx.moveTo(-u*.54,-u*.08);ctx.quadraticCurveTo(-u*.27,-u*.14,-u*.06,-u*.07);
  ctx.moveTo(u*.06,-u*.07);ctx.quadraticCurveTo(u*.3,-u*.15,u*.54,-u*.08);ctx.stroke();
  ctx.fillStyle="#9f786b";ctx.beginPath();ctx.ellipse(0,u*.31,u*.22,u*.25,0,0,Math.PI*2);ctx.fill();
  for(const side of [-1,1]){
    ctx.fillStyle="#402d32";ctx.beginPath();
    ctx.ellipse(side*u*.13,u*.47,u*.069,u*.039,side*.14,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle="#64363a";ctx.beginPath();ctx.ellipse(0,u*.72,u*.26,u*.065,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawIsland(
  ctx:CanvasRenderingContext2D,w:number,h:number,s:Stage2Nav,
  island:Stage2Island,people:People,zoom:number,time:number,optic:boolean,
):void {
  const dx=island.x-s.x,dy=island.y-s.y;
  const distance=Math.max(3,Math.hypot(dx,dy));
  const relative=signedBearing(bearingTo(dx,dy)-s.heading);
  const fov=110/zoom;
  if(Math.abs(relative)>fov*.58)return;
  // Until the pilot has flown most of the distance, land is invisible to
  // the naked eye and merely a tiny fuzzy clue through the binoculars.
  // At roughly the remaining one-third of blood the island starts resolving.
  if(!optic&&distance>165)return;
  const fade=optic
    ? clamp((540-distance)/180,0.10,0.65)
    : clamp((165-distance)/85,0,1);
  const x=w*.5+Math.tan(relative*deg)*w/(2*Math.tan(fov*deg/2));
  // Only at close range does the person's face become truly huge, like
  // a planet ahead; the telescope cannot reveal an exact opening at launch.
  // An island is far larger than a person. Keep the first scope silhouette
  // tiny at 400m, then increase its apparent size smoothly on approach.
  const approach=clamp((420-distance)/280,0,1);
  const distantScale=.17+.83*approach*approach*(3-2*approach);
  const nearMagnification=distance<65
    ? 1+4.2*Math.pow(1-distance/65,2)
    : 1;
  const size=clamp(h*13.2*zoom/(distance+62)*distantScale*nearMagnification,.5,h*6);
  const horizon=h*(0.525+s.pitch*.0035+(s.altitude-2.05)*.0030);
  // Consistent vertical perspective: a higher craft sees shoreline and
  // the face move downward while the visible ship climbs on the main screen.
  const y=horizon-size*.19+(s.altitude-2.05)*size*.055;
  ctx.save();ctx.translate(x,y);ctx.globalAlpha*=fade;
  const polar=island.id==="antarctic";
  const remote=island.id==="visitor";
  // Expand the terrain separately from the people; the previous rendering
  // made the coastline look barely bigger than the figure standing on it.
  ctx.save();
  ctx.scale(1.60,1.42);
  ctx.fillStyle=polar?"#607d89":remote?"#38594e":"#4b6654";
  ctx.beginPath();ctx.moveTo(-size*1.7,size*.21);
  ctx.bezierCurveTo(-size*.92,-size*.20,-size*.80,-size*.34,-size*.45,-size*.42);
  ctx.lineTo(-size*.19,-size*(polar?.78:.49));
  ctx.quadraticCurveTo(size*.05,-size*.44,size*.36,-size*.55);
  ctx.quadraticCurveTo(size*.80,-size*.10,size*1.65,size*.25);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=polar?"#d6e6e5":"#d2be91";
  ctx.beginPath();ctx.moveTo(-size*1.73,size*.19);
  ctx.quadraticCurveTo(0,size*.075,size*1.72,size*.20);
  ctx.lineTo(size*1.72,size*.43);ctx.lineTo(-size*1.73,size*.43);ctx.fill();

  if(polar){
    ctx.fillStyle="#c3cbd3";
    ctx.fillRect(-size*.32,-size*.39,size*.66,size*.30);
    ctx.fillStyle="#c8694a";
    ctx.fillRect(-size*.24,-size*.28,size*.13,size*.12);
    ctx.fillRect(size*.06,-size*.28,size*.13,size*.12);
    ctx.strokeStyle="#b1d9df";ctx.lineWidth=Math.max(.6,size*.024);
    ctx.beginPath();ctx.moveTo(size*.45,-size*.39);ctx.lineTo(size*.45,-size*.8);ctx.stroke();
  }else{
    ctx.fillStyle="#29493c";
    for(let i=0;i<5;i++){
      const ax=(i-2)*size*.37;
      ctx.beginPath();ctx.moveTo(ax,-size*.11);
      ctx.lineTo(ax-size*.13,-size*.48);ctx.lineTo(ax+size*.14,-size*.48);
      ctx.closePath();ctx.fill();
    }
  }
  if(remote&&people.visitor){
    ctx.fillStyle="#d3d5c9";
    ctx.beginPath();ctx.moveTo(-size*.97,size*.17);
    ctx.lineTo(-size*.48,size*.12);ctx.lineTo(-size*.44,size*.24);
    ctx.lineTo(-size*1.04,size*.26);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#a5cbd1";ctx.lineWidth=Math.max(.6,size*.017);
    ctx.beginPath();ctx.moveTo(-size*.75,size*.13);
    ctx.lineTo(-size*.75,-size*.25);ctx.stroke();
    ctx.fillStyle="#93b6bd";ctx.beginPath();
    ctx.moveTo(-size*.75,-size*.26);ctx.lineTo(-size*.50,size*.08);
    ctx.lineTo(-size*.75,size*.08);ctx.closePath();ctx.fill();
  }

  ctx.restore();
  // The human is small beside the coast, but becomes giant relative to the
  // hovercraft only on final approach. The face is centred on the collider.
  if(people[island.id]&&distance<100){
    const finalFaceApproach=clamp((23-distance)/23,0,1);
    const u=Math.max(.65,size*(.17+.055*finalFaceApproach));
    const skin=island.id==="japan"?"#d7a77e":island.id==="antarctic"?"#bf9782":"#8e6554";
    const hair=island.id==="japan"?"#181c24":island.id==="antarctic"?"#313b42":"#312d30";
    const face = stage2FaceHeights(island);
    const profile = (face.nose+face.mouth)*.5;
    // Taller polar worker is set a little higher in the same projection.
    const faceBaseY=-size*.16-(profile-6.2)*size*.02;
    drawFigure(ctx,0,faceBaseY,u,skin,hair,
      island.id==="antarctic"?"#df762e":"#7da09f",polar,time);
    if(remote){
      drawFigure(ctx,-size*.07,-size*.18,u*.85,"#e7b999","#573b2f","#cf707c",false,time);
      drawFigure(ctx,size*.57,-size*.16,u*.75,"#a8795c","#242527","#e8c979",false,time);
    }
  }

  ctx.restore();
}

function drawSeascape(
  ctx:CanvasRenderingContext2D,w:number,h:number,s:Stage2Nav,
  people:People,zoom:number,time:number,optic:boolean,
):void {
  const horizon=h*(.525+s.pitch*.0035+(s.altitude-2.05)*.0030);
  ctx.clearRect(0,0,w,h);
  const sky=ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,"#286d8d");sky.addColorStop(.65,"#85bbcc");sky.addColorStop(1,"#b9d3cf");
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,horizon+1);
  const water=ctx.createLinearGradient(0,horizon,0,h);
  water.addColorStop(0,"#3b8299");water.addColorStop(.5,"#156582");
  water.addColorStop(1,"#062c48");
  ctx.fillStyle=water;ctx.fillRect(0,horizon,w,h-horizon);
  // Sparse moving crests keep the sea alive without a full-resolution shader.
  for(let i=0;i<(optic?18:62);i++){
    const depth=(i+.5)/(optic?18:62);
    const y=horizon+(h-horizon)*depth*depth;
    const x=w*((i*.6180339+time*.008*(.4+depth*2))%1);
    const len=w*(.012+depth*.06);
    ctx.strokeStyle="rgba(196,238,231,"+(.04+depth*.22)+")";
    ctx.lineWidth=Math.max(.5,depth*1.6);
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x+len*.45,y-depth*2,x+len,y);
    ctx.stroke();
  }
  for(const island of STAGE2_ISLANDS)drawIsland(ctx,w,h,s,island,people,zoom,time,optic);
}

function drawHovercraft(ctx:CanvasRenderingContext2D,w:number,h:number,s:Stage2Nav):void {
  const m=Math.min(w,h);
  // Vessel is the SAME Stage 1 escape skiff (not the damaged landing hull).
  const size=m*.19;
  const speed=Math.hypot(s.vx,s.vy);
  const altitudeShift=clamp((s.altitude-2.05)*h*.038,-h*.055,h*.37);
  const bob=Math.sin(s.seconds*2.8)*Math.max(.7,2.2-s.altitude*.1);
  const x=w*.50;
  const y=h*.79-altitudeShift+bob;
  const seaY=h*.85;
  const shadowAlpha=clamp(.33-s.altitude*.020,.05,.28);

  // A softened hovering shadow stays on the water instead of following the hull.
  ctx.save();
  ctx.translate(x,seaY);
  ctx.scale(1,.32);
  const shadow=ctx.createRadialGradient(0,0,size*.1,0,0,size*1.6);
  shadow.addColorStop(0,"rgba(2,20,31,"+shadowAlpha+")");
  shadow.addColorStop(1,"rgba(2,24,40,0)");
  ctx.fillStyle=shadow;ctx.beginPath();
  ctx.arc(0,0,size*1.6,0,Math.PI*2);ctx.fill();
  ctx.restore();

  // Wispy heat-shimmer ribbons and a refractive ghost of the sea, BELOW
  // the hovering metal; approximate refraction without expensive readPixels.
  // These grow with flight speed but remain subtle and translucent.
  const shimmer=clamp(.18+speed/18,0,1);
  if(s.outcome===null && shimmer>.05){
    ctx.save();
    ctx.beginPath();
    ctx.rect(x-size*1.7,y+size*.06,size*3.4,
      Math.max(0,seaY-y+size*.55));
    ctx.clip();
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<8;i++){
      const t=s.seconds*(1.7+speed*.065)+i*1.71;
      const offset=(i-3.5)*size*.19+Math.sin(t*2.7)*size*.06;
      const startY=y+size*(.14+i*.085);
      ctx.beginPath();ctx.moveTo(x+offset,startY);
      ctx.bezierCurveTo(x+offset+Math.sin(t)*size*.13,startY+size*.16,
        x+offset-Math.sin(t*.72)*size*.10,startY+size*.46,
        x+offset+Math.sin(t*1.13)*size*.06,startY+size*.83);
      ctx.strokeStyle="rgba(150,233,231,"+
        (0.018+shimmer*.030+(i%3)*.004)+")";
      ctx.lineWidth=Math.max(.9,m*.0032);ctx.stroke();
    }
    ctx.restore();

    // Forward motion has a reference: water streaks accelerate underneath
    // the craft and its projected shadow. No HUD-only illusion of velocity.
    if(speed>1.2){
      ctx.save();ctx.globalCompositeOperation="screen";
      const intensity=clamp(speed/14,0,1);
      for(let i=0;i<19;i++){
        const seed=(i*.61803399+.17)%1;
        const progress=((s.seconds*(.11+intensity*.62)+seed)%1);
        const yLine=seaY+m*.012+progress*(h-seaY);
        const xLine=x+(seed-.5)*m*(.4+progress*.75);
        const len=m*(.008+intensity*.023+progress*.021);
        ctx.strokeStyle="rgba(182,231,224,"+(intensity*(.065+progress*.09))+")";
        ctx.lineWidth=Math.max(.6,progress*1.6);
        ctx.beginPath();ctx.moveTo(xLine-len*.5,yLine);
        ctx.lineTo(xLine+len*.5,yLine);ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Both attitudes are smoothed in the physics state. Turning right
  // banks right; accelerating gently raises the nose, then settles level.
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(s.bank*.82-s.noseLift);
  drawEscapeSkiff(ctx,0,0,size,1,-.08,1);
  ctx.restore();
}

function drawMonitor(
  ctx:CanvasRenderingContext2D,w:number,h:number,s:Stage2Nav,
  people:People,zoom:number,time:number,
):void {
  // The monitor always faces the same bearing as the craft. It does not
  // lock onto or automatically center a person's nose/mouth.
  drawSeascape(ctx,w,h,s,people,zoom,time,true);
  const cx=w*.5,cy=h*.52,r=Math.min(w,h)*.10;
  ctx.strokeStyle="rgba(187,241,230,.91)";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(cx-r*2,cy);ctx.lineTo(cx-r*.5,cy);
  ctx.moveTo(cx+r*.5,cy);ctx.lineTo(cx+r*2,cy);
  ctx.moveTo(cx,cy-r*2);ctx.lineTo(cx,cy-r*.5);
  ctx.moveTo(cx,cy+r*.5);ctx.lineTo(cx,cy+r*2);ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,r*.47,0,Math.PI*2);ctx.stroke();
}

function createCanvasScale(canvas:HTMLCanvasElement):{w:number;h:number;dpr:number}{
  const w=Math.max(1,Math.round(canvas.clientWidth));
  const h=Math.max(1,Math.round(canvas.clientHeight));
  const dpr=Math.min(1.3,window.devicePixelRatio||1);
  const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  return {w,h,dpr};
}

export function ReentryStage2Prototype({
  onClose,onExitHome,
}:{onClose:()=>void;onExitHome:()=>void}){
  const mainRef=useRef<HTMLCanvasElement>(null);
  const opticRef=useRef<HTMLCanvasElement>(null);
  const simRef=useRef<Stage2Nav>(initialStage2Nav());
  const inputRef=useRef<Stage2Input>({...baseKeys});
  const peopleRef=useRef<People>(defaultPeople);
  const zoomRef=useRef(1);
  const [people,setPeople]=useState<People>(defaultPeople);
  const [hud,setHud]=useState<Stage2Nav>(initialStage2Nav);
  const [zoomIndex,setZoomIndex]=useState(0);
  const [thrustView,setThrustView]=useState(0);
  const [stick,setStick]=useState({x:0,y:0});
  const stickPointerRef=useRef<number|null>(null);
  const [stage3Notice,setStage3Notice]=useState(false);
  const [help,setHelp]=useState(false);
  const keysHeld=useRef<Set<string>>(new Set());
  const [opticGone,setOpticGone]=useState(false);
  const opticGoneRef=useRef(false);
  const [assistedTestClear,setAssistedTestClear]=useState(false);
  const [resultReady,setResultReady]=useState(false);
  const resultReadyRef=useRef(false);
  const resultBeganAt=useRef<number|null>(null);
  const headerTaps=useRef<{count:number;last:number;timer:number|null}>({
    count:0,last:0,timer:null,
  });
  const pressingThrust=useRef(false);
  const hudPublished=useRef(0);
  const soundUpdated=useRef(0);
  // Route changes or leaving Stage 2 must never leave cabin sound playing.
  useEffect(() => () => {
    if(headerTaps.current.timer!==null)
      window.clearTimeout(headerTaps.current.timer);
    stopStage2CabinAudio();
  }, []);
  // PC keyboard complements pointer controls; neither changes the physics API.
  // The controls never capture browser modifier shortcuts or text inputs.
  useEffect(()=>{
    const flightKeys=new Set([
      "ArrowLeft","ArrowRight","ArrowUp","ArrowDown",
      "KeyA","KeyD","KeyW","KeyS",
    ]);
    const zoomPlus=new Set(["Equal","NumpadAdd"]);
    const zoomMinus=new Set(["Minus","NumpadSubtract"]);
    const keydown=(e:KeyboardEvent)=>{
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const target=e.target;
      if(target instanceof HTMLElement &&
         (target.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(target.tagName)))return;
      if(flightKeys.has(e.code)){
        e.preventDefault();keysHeld.current.add(e.code);
      } else if(zoomPlus.has(e.code)||zoomMinus.has(e.code)){
        e.preventDefault();
        if(!e.repeat){
          resumeStage2CabinAudio();
          setZoomIndex(i=>clamp(i+(zoomPlus.has(e.code)?1:-1),0,STAGE2_ZOOMS.length-1));
        }
      } else if(e.code==="Escape"){
        setHelp(false);
      }
    };
    const keyup=(e:KeyboardEvent)=>{
      if(flightKeys.has(e.code)){
        keysHeld.current.delete(e.code);e.preventDefault();
      }
    };
    const release=()=>{keysHeld.current.clear();};
    window.addEventListener("keydown",keydown);
    window.addEventListener("keyup",keyup);
    window.addEventListener("blur",release);
    return()=>{
      release();
      window.removeEventListener("keydown",keydown);
      window.removeEventListener("keyup",keyup);
      window.removeEventListener("blur",release);
    };
  },[]);
  // A tab-local hint only: it does not touch the saved stage or achievements.
  useEffect(()=>{
    const desktop=window.matchMedia("(pointer: fine)").matches ||
      window.innerWidth>=900;
    if(!desktop)return;
    try {
      if(window.sessionStorage.getItem("miav-stage2-pc-help-v1")==="1")return;
    } catch {/* Private browsing may disable storage. */}
    // Defer the initial hint to the next paint; never synchronize React
    // state directly inside an effect body.
    const frame=window.requestAnimationFrame(()=>setHelp(true));
    return()=>window.cancelAnimationFrame(frame);
  },[]);
  const dismissHelp=()=>{
    setHelp(false);
    try{window.sessionStorage.setItem("miav-stage2-pc-help-v1","1");}
    catch {/* Saving the hint must never affect play. */}
  };
  useEffect(()=>{zoomRef.current=STAGE2_ZOOMS[zoomIndex];},[zoomIndex]);
  useEffect(()=>{
    const refresh=()=>{
      const current=stage2Visitors(new Date());
      peopleRef.current=current;setPeople(current);
    };
    refresh();
    const id=window.setInterval(refresh,60000);
    return()=>window.clearInterval(id);
  },[]);

  useEffect(()=>{
    const main=mainRef.current,optics=opticRef.current;
    const ctx=main?.getContext("2d"),scope=optics?.getContext("2d");
    if(!main||!ctx||!optics||!scope)return;
    let raf=0,previous=0;
    const frame=(now:number)=>{
      if(!previous)previous=now;
      const dt=Math.min(.05,Math.max(0,(now-previous)/1000));
      previous=now;
      const held=keysHeld.current;
      if(stickPointerRef.current===null){
        inputRef.current.steerX=Number(held.has("ArrowRight")||held.has("KeyD"))-
          Number(held.has("ArrowLeft")||held.has("KeyA"));
        inputRef.current.steerY=Number(held.has("ArrowUp"))-Number(held.has("ArrowDown"));
      }
      if(!pressingThrust.current){
        inputRef.current.thrust=Number(held.has("KeyW"))-Number(held.has("KeyS"));
      }
      simRef.current=stepStage2(simRef.current,inputRef.current,dt,peopleRef.current);
      const sim=simRef.current;
      if(sim.outcome) {
        inputRef.current.thrust=0;
        inputRef.current.steerX=0;
        inputRef.current.steerY=0;
        if(resultBeganAt.current===null)resultBeganAt.current=now;
        if(!resultReadyRef.current && now-resultBeganAt.current>=1050){
          resultReadyRef.current=true;
          setResultReady(true);
        }
      } else if (!opticGoneRef.current) {
        // One-way handoff: close the optical scope only once a shoreline
        // fills enough of the unzoomed view to steer by eye. Don't reopen
        // at the threshold if the craft circles back.
        for(const island of STAGE2_ISLANDS){
          const distance=islandDistance(sim,island);
          const offAxis=Math.abs(signedBearing(
            bearingTo(island.x-sim.x,island.y-sim.y)-sim.heading));
          if(distance<105 && offAxis<43){
            opticGoneRef.current=true;
            setOpticGone(true);
            break;
          }
        }
      }
      const c=createCanvasScale(main);
      ctx.setTransform(c.dpr,0,0,c.dpr,0,0);
      drawSeascape(ctx,c.w,c.h,sim,peopleRef.current,1,now/1000,false);
      drawHovercraft(ctx,c.w,c.h,sim);
      if(sim.outcome==="NOSE"||sim.outcome==="MOUTH"){
        const entryT=clamp((now-(resultBeganAt.current??now))/1050,0,1);
        ctx.fillStyle="rgba(1,7,17,"+(entryT*.76)+")";
        ctx.fillRect(0,0,c.w,c.h);
      }
      if(!opticGoneRef.current){
        const o=createCanvasScale(optics);
        scope.setTransform(o.dpr,0,0,o.dpr,0,0);
        drawMonitor(scope,o.w,o.h,sim,peopleRef.current,zoomRef.current,now/1000);
      }
      if (sim.outcome) {
        stopStage2CabinAudio();
      } else if (now - soundUpdated.current >= 450) {
        soundUpdated.current = now;
        updateStage2CabinAudio(sim.blood, sim.throttle);
      }
      if(now-hudPublished.current>120||sim.outcome&&now-hudPublished.current>50){
        hudPublished.current=now;
        setHud({...sim});
        setThrustView(sim.targetSpeed/14);
      }
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return()=>cancelAnimationFrame(raf);
  },[]);

  const zoomIn=()=>{
    resumeStage2CabinAudio();
    setZoomIndex(i=>Math.min(STAGE2_ZOOMS.length-1,i+1));
  };
  const zoomOut=()=>setZoomIndex(i=>Math.max(0,i-1));
  const moveStick=(e:ReactPointerEvent<HTMLDivElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const xx=(e.clientX-(rect.left+rect.width/2))/(rect.width*0.37);
    const yy=(e.clientY-(rect.top+rect.height/2))/(rect.height*0.37);
    const norm=Math.max(1,Math.hypot(xx,yy));
    const x=clamp(xx/norm,-1,1),y=clamp(yy/norm,-1,1);
    inputRef.current.steerX=x;
    inputRef.current.steerY=-y;
    setStick({x,y});
  };
  const beginStick=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(simRef.current.outcome)return;
    e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* optional */}
    stickPointerRef.current=e.pointerId;
    moveStick(e);
  };
  const clearStick=()=>{
    stickPointerRef.current=null;
    inputRef.current.steerX=0;
    inputRef.current.steerY=0;
    setStick({x:0,y:0});
  };
  const updateSpeedLever=(e:ReactPointerEvent<HTMLButtonElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    // Top raises cruising speed; bottom reduces it. Middle is neutral.
    // The set speed survives lifting your finger off this lever.
    const position=clamp(
      (rect.top+rect.height/2-e.clientY)/(rect.height*.43),-1,1,
    );
    inputRef.current.thrust=Math.abs(position)<.13?0:position;
  };
  const startThrust=(e:ReactPointerEvent<HTMLButtonElement>)=>{
    e.preventDefault();
    resumeStage2CabinAudio();
    if(simRef.current.outcome||simRef.current.blood<=0)return;
    pressingThrust.current=true;
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* optional */}
    updateSpeedLever(e);
  };
  const stopThrust=()=>{
    pressingThrust.current=false;
    // Zero input means HOLD CURRENT CRUISE, NOT "STOP".
    inputRef.current.thrust=0;
    setThrustView(simRef.current.targetSpeed/14);
  };
  const reset=()=>{
    // Retry is another explicit user gesture; recreate the soundscape
    // after the previous impact closed its AudioContext.
    startStage2CabinAudio(getReentryUserVolume());
    stopThrust();
    clearStick();
    inputRef.current={...baseKeys};
    keysHeld.current.clear();
    simRef.current=initialStage2Nav();
    setHud({...simRef.current});
    opticGoneRef.current=false;
    setOpticGone(false);
    setAssistedTestClear(false);
    resultBeganAt.current=null;
    resultReadyRef.current=false;
    setResultReady(false);
    setZoomIndex(0);setStage3Notice(false);
  };
  useEffect(()=>()=>{
    pressingThrust.current=false;
    inputRef.current={...baseKeys};
  },[]);

  // Same 700ms / three-tap gesture as the Stage 1 title. A single
  // tap returns home; three rapid taps trigger an UNSCORED test clear.
  // This never changes the normal physics or any score/leaderboard data.
  const handleTitleTap=()=>{
    const now=performance.now();
    const tap=headerTaps.current;
    if(now-tap.last>700)tap.count=0;
    tap.last=now;
    tap.count++;
    if(tap.timer!==null){window.clearTimeout(tap.timer);tap.timer=null;}
    if(tap.count>=3){
      tap.count=0;
      // Works even after a failed trial, so the clear screen can be tested
      // without restarting the entire stage.
      const current=simRef.current;
      resultBeganAt.current=null;
      resultReadyRef.current=false;
      setResultReady(false);
      simRef.current={...current,outcome:"NOSE",destination:current.destination};
      setHud({...simRef.current});
      setAssistedTestClear(true);
      setStage3Notice(false);
      return;
    }
    tap.timer=window.setTimeout(()=>{
      tap.count=0;tap.timer=null;
      onExitHome();
    },700);
  };
  const wind=stage2Wind(hud);
  const speed=Math.hypot(hud.vx,hud.vy);
  const clear=hud.outcome==="NOSE"||hud.outcome==="MOUTH";
  const activeCount=Number(people.japan)+Number(people.antarctic)+Number(people.visitor);
  const nearest=STAGE2_ISLANDS.slice().sort((a,b)=>islandDistance(hud,a)-islandDistance(hud,b))[0];
  return <div className="absolute inset-0 z-[90] overflow-hidden bg-[#062536] text-cyan-50"
    role="region" aria-label="Stage 2 · free navigation across 360-degree ocean">
    <canvas ref={mainRef} className="absolute inset-0 h-full w-full"
      aria-label="Panoramic ocean with three distant islands and a steerable hovercraft"/>
    {/* Same global AUDIO volume and mute preference as Stage 1. */}
    <ReentryAudioControl />
    <button type="button" onClick={handleTitleTap}
      className="absolute left-5 top-5 z-[96] rounded-sm border border-white/15 bg-black/35 px-4 py-2 text-[0.72rem] font-medium tracking-[0.20em] text-white/85 backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
      aria-label="MIAV-922228 home. Triple tap tests Stage 2 clear without recording a score.">
      MIAV-922228
    </button>
    <div className="absolute left-3 top-[4.35rem] z-[96] flex gap-2 sm:left-5">
      <button type="button" onClick={onClose} className={ctrl+" px-3 py-1.5"}>BACK</button>
      <button type="button" onClick={()=>help?dismissHelp():setHelp(true)}
        className={ctrl+" px-3 py-1.5"} aria-label="Controls help">?</button>
    </div>
    {opticGone&&<p className="pointer-events-none absolute right-4 top-[4.65rem] z-[94] rounded border border-cyan-100/30 bg-[#082533]/70 px-2 py-1 font-mono text-[.54rem] tracking-wider">VISUAL CONTACT</p>}
    {help&&<div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/25 px-3 py-6 pointer-events-none">
      <section role="dialog" aria-modal="false" aria-label="Stage 2 controls"
        className="pointer-events-auto w-[min(94vw,21rem)] max-h-full overflow-y-auto rounded-lg border border-cyan-200/40 bg-[#061f2a]/95 p-4 text-[.73rem] leading-5 text-cyan-50 shadow-2xl backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between gap-3">
          <strong className="font-mono tracking-[.12em]">FLIGHT CONTROLS</strong>
          <button type="button" className={ctrl+" px-3 py-1"} onClick={dismissHelp}>CLOSE ×</button>
        </div>
        <p>Turn: drag TURN / ALT left or right, or use ← / → or A / D.</p>
        <p className="mt-1">Altitude: drag the pad up or down, or use ↑ / ↓. Release to hold.</p>
        <p className="mt-1">Cruise speed: hold the top or bottom of SPEED, or W / S. Release to maintain speed.</p>
        <p className="mt-1">Optical zoom: + / − buttons or keyboard + / −.</p>
        <p className="mt-2 text-cyan-100/70">Blood is consumed in flight. The optical monitor closes automatically near a shoreline. Press ? to reopen this guide.</p>
      </section>
    </div>}



    {/* One scrollable instrument column keeps optics, blood and speed from
        ever covering one another, including zoomed and landscape layouts. */}
    <div role="group" aria-label="Optics, blood and cruise speed"
      className="absolute right-2 top-[5.2rem] bottom-7 z-[95] flex w-[min(44vw,17rem)] min-w-[8rem] flex-col items-stretch gap-2 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 sm:right-5 sm:w-[min(34vw,17rem)]">
    <div className={"w-full shrink-0 overflow-hidden rounded-lg border border-cyan-200/55 bg-[#051925]/95 shadow-[0_8px_24px_rgba(0,0,0,.55)] transition-opacity duration-1000 "+(opticGone?"hidden":"opacity-100")+""}
      aria-hidden={opticGone}>
      <div className="flex items-center justify-between border-b border-cyan-100/20 px-2 py-1 font-mono text-[.52rem] tracking-wider">
        <span>COCKPIT · OPTICS</span><span>{STAGE2_ZOOMS[zoomIndex]}×</span>
      </div>
      <canvas ref={opticRef} className="block aspect-[1.65] w-full" aria-label="Magnified view of the same forward bearing"/>
      <div className="flex flex-wrap justify-between gap-x-2 bg-[#04121a] px-2 py-1 font-mono text-[.54rem]">
        <span>WIND {wind.arrow} {wind.strength}</span>
        <span>HDG {Math.round(hud.heading)}°</span>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5">
        <button type="button" className={ctrl+" px-3 py-1"} onClick={zoomOut} disabled={zoomIndex===0} aria-label="Zoom out">−</button>
        <span className="font-mono text-[.56rem] text-cyan-100/75">OPTICAL ZOOM</span>
        <button type="button" className={ctrl+" px-3 py-1"} onClick={zoomIn} disabled={zoomIndex===STAGE2_ZOOMS.length-1} aria-label="Zoom in">+</button>
      </div>
    </div>
      <div className="pointer-events-none flex w-full shrink-0 items-center gap-2 rounded-md border border-rose-200/45 bg-[#1b0710]/90 px-2 py-2 shadow-xl"
        role="meter" aria-label="Blood reserve" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.blood*100)}>
        <span className="font-mono text-[.55rem] font-bold text-rose-200">BLOOD</span>
        <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-sm border border-rose-200/30 bg-[#2b0915]">
          <div className="h-full bg-gradient-to-r from-[#7c0f28] via-[#c7304f] to-[#f68489] transition-[width] duration-150"
            style={{width:(hud.blood*100)+"%"}}/>
          <div className="absolute inset-y-0 left-[33.33%] border-l border-dashed border-white/65"/>
        </div>
        <span className="font-mono text-[.61rem] font-bold tabular-nums text-rose-100">{Math.round(hud.blood*100)}%</span>
      </div>
      {!hud.outcome&&(
      <div className="flex w-full shrink-0 flex-col items-center gap-1 rounded-xl border border-rose-200/25 bg-[#031823]/85 p-2">
        <div className="font-mono text-[.52rem] tracking-wide text-rose-100/85">CRUISE SPEED</div>
        <button type="button"
          className="relative h-28 w-20 touch-none overflow-hidden rounded-xl border border-rose-100/70 bg-gradient-to-b from-[#bc6340] via-[#7e324a] to-[#301536] text-rose-50 shadow-lg active:brightness-125 sm:h-32 sm:w-24"
          aria-label="Hold upper lever to speed up or lower lever to slow down; release to maintain speed"
          onPointerDown={startThrust}
          onPointerMove={e=>{if(pressingThrust.current)updateSpeedLever(e);}}
          onPointerUp={stopThrust} onPointerCancel={stopThrust}
          onLostPointerCapture={stopThrust}>
          <span className="pointer-events-none absolute left-1 top-2 font-mono text-[.48rem]">▲ FASTER</span>
          <span className="pointer-events-none absolute inset-x-2 top-1/2 border-t border-rose-100/35"/>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-mono text-lg font-bold"
            style={{bottom:"calc("+(thrustView*72+10)+"% - 11px)"}}>●</span>
          <span className="pointer-events-none absolute bottom-1 left-1 font-mono text-[.48rem]">▼ SLOWER</span>
        </button>
        <div className="font-mono text-[.53rem] font-semibold text-rose-100">
          {hud.targetSpeed.toFixed(1)} m/s
        </div>
        <div className="font-mono text-[.46rem] text-cyan-100/70">RELEASE = HOLD SPEED</div>
      </div>
      )}
    </div>

    <div className="pointer-events-none absolute left-3 top-[7.6rem] z-[92] w-fit max-w-[45%] rounded bg-[#052130]/65 px-2 py-1.5 font-mono text-[.56rem] leading-5 tabular-nums sm:left-5 sm:top-[7.6rem]">
      <div className="font-semibold tracking-widest text-cyan-50">STAGE 2</div>
      <div>SPD {speed.toFixed(1)} m/s · SET {hud.targetSpeed.toFixed(1)}</div>
      <div>ALT {hud.altitude.toFixed(1)} m · SET {hud.targetAltitude.toFixed(1)}</div>
      <div>HDG {Math.round(hud.heading)}° · WIND {wind.arrow} {wind.strength}</div>
      <div className="text-cyan-100/65">ACTIVE SIGNALS {activeCount}</div>
      <div className="text-cyan-100/65">
        {islandDistance(hud,nearest)<165
          ? "SHORE "+Math.round(islandDistance(hud,nearest))+" m"
          : "SHORE --"}
      </div>
      {islandDistance(hud,nearest)<90 && people[nearest.id] && (
        <div className="text-amber-100/85">
          FACE ALT ~{Math.floor(stage2FaceHeights(nearest).mouth)}–
          {Math.ceil(stage2FaceHeights(nearest).nose)} m
        </div>
      )}
    </div>

    <div className="pointer-events-none absolute -bottom-4 inset-x-0 z-[90] h-20 rounded-t-[40%] border-t border-cyan-100/35 bg-gradient-to-b from-[#1c5260]/80 to-[#04131e]">
      <div className="mx-auto mt-11 flex w-fit gap-2 opacity-75">
        {["#e2a04d","#5bb09c","#76b0de","#d27c8d","#e4cf7b"].map((c,i)=>
          <span key={i} className="h-8 w-8 rounded-full border border-white/25" style={{backgroundColor:c}}/>)}
      </div>
    </div>



    {!hud.outcome&&<div className="absolute left-3 bottom-[6%] z-[95] flex items-end sm:bottom-[7%] sm:left-8"
      role="group" aria-label="Two-thumb hovercraft flight controls">
      <div className="rounded-xl border border-cyan-100/20 bg-[#031823]/90 p-2">
        <div className="mb-1 text-center font-mono text-[.50rem] tracking-[.12em] text-cyan-100/70">TURN / ALT</div>
        <div role="group" aria-label="Analog direction pad: left and right turn, up ascends, down descends"
          className="relative h-[7.5rem] w-[7.5rem] touch-none rounded-full border-2 border-cyan-100/40 bg-[#082f40]/95 shadow-[inset_0_3px_12px_rgba(0,0,0,.55)] sm:h-36 sm:w-36"
          onPointerDown={beginStick}
          onPointerMove={e=>{if(stickPointerRef.current===e.pointerId)moveStick(e);}}
          onPointerUp={clearStick} onPointerCancel={clearStick}
          onLostPointerCapture={clearStick}>
          <div className="pointer-events-none absolute inset-3 rounded-full border border-cyan-100/20"/>
          <span className="pointer-events-none absolute left-1/2 top-1 text-sm text-white/35 -translate-x-1/2">↑</span>
          <span className="pointer-events-none absolute left-1 top-1/2 text-sm text-white/35 -translate-y-1/2">←</span>
          <span className="pointer-events-none absolute right-1 top-1/2 text-sm text-white/35 -translate-y-1/2">→</span>
          <span className="pointer-events-none absolute bottom-1 left-1/2 text-sm text-white/35 -translate-x-1/2">↓</span>
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-100/65 bg-gradient-to-b from-[#559aaa] to-[#1d526c] shadow-lg"
            style={{transform:"translate(calc(-50% + "+(stick.x*36)+"px),calc(-50% + "+(stick.y*36)+"px))"}}>
            <span className="h-2 w-2 rounded-full bg-cyan-100/80"/>
          </div>
        </div>
      </div>

    </div>}

    {hud.outcome&&(resultReady || !clear)&&<div className="absolute inset-x-2 bottom-[13%] z-[96] flex flex-col items-center gap-3 text-center">
      <div className={"w-[min(92vw,27rem)] rounded-lg border px-5 py-5 shadow-[0_10px_35px_rgba(0,0,0,.7)] "+
        (clear?"border-cyan-100/55 bg-[#061a2b]/95":"border-white/35 bg-[#061923]/95")} role="status">
        <p className="font-mono text-base font-semibold tracking-[.22em] text-white">
          {clear?"STAGE 2 CLEAR":"STAGE 2 · FLIGHT ENDED"}
        </p>
        <p className="mt-2 font-mono text-[.69rem] tracking-[.12em] text-cyan-100/80">
          {clear?(hud.outcome==="NOSE"?"NASAL ENTRY":"ORAL ENTRY"):stage2OutcomeText(hud.outcome)}
        </p>
        {assistedTestClear&&<p className="mt-2 font-mono text-[.62rem] tracking-wider text-amber-200">TEST CLEAR · UNSCORED</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {clear&&<button type="button" className={ctrl+" px-4 py-2"} onClick={()=>setStage3Notice(v=>!v)}>STAGE 3</button>}
          <button type="button" className={ctrl+" px-4 py-2"} onClick={reset}>RETRY</button>
          <button type="button" className={ctrl+" px-4 py-2"} onClick={onClose}>BACK</button>
        </div>
        {stage3Notice&&<p className="mt-3 rounded bg-black/60 px-3 py-2 font-mono text-xs tracking-wider">STAGE 3 — COMING SOON</p>}
      </div>
    </div>}
    {clear&&!resultReady&&(
      <p className="pointer-events-none absolute inset-x-0 top-[42%] z-[95] text-center font-mono text-[.72rem] tracking-[.24em] text-cyan-100/90">
        ENTERING {hud.outcome==="NOSE"?"NASAL":"ORAL"} PASSAGE
      </p>
    )}
    <p className="pointer-events-none absolute bottom-1 inset-x-0 z-[92] text-center font-mono text-[.44rem] tracking-wider text-white/45">
      STAGE 2 · BLOOD NAVIGATION PROTOTYPE · NO RANDOM HIT ROLL
    </p>
  </div>;
}
