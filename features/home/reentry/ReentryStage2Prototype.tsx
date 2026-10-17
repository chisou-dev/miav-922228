"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReentryLaunchControls } from "./ReentryLaunchControls";

// STAGE 2 proof-of-concept. No Stage 1 physics is reused or modified.
// The coastline and face are deliberately provisional Canvas art; the aim
// and continuous approach camera are the subject of this first prototype.
type DemoPhase = "power" | "angle" | "flight" | "result";
type Hit = "NOSE" | "MOUTH" | null;
const DURATION_S = 12;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const t = clamp(v); return t*t*(3-2*t); };
const wrap = (v: number) => (v%1+1)%1;
const difference = (a: number,b: number) => {
  const d = wrap(a-b); return d > 0.5 ? d-1 : d;
};

function drawStage2(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  elapsed: number, phase: DemoPhase,
  angle: number, power: number,
  hit: Hit,
): void {
  const t = phase === "flight" || phase === "result"
    ? ease(elapsed / DURATION_S) : 0;
  const horizon = h * 0.57;
  const sky = ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,"#387a9a");
  sky.addColorStop(0.55,"#75acc2");
  sky.addColorStop(1,"#d8d2b7");
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  // Very faint scattered high clouds: no flat sky cutout.
  ctx.save();ctx.globalAlpha=0.07;
  for(let i=0;i<11;i++){
    const cx=w*((i*0.173+0.13)%1),cy=h*(0.12+(i%4)*0.052);
    const cloud=ctx.createRadialGradient(cx,cy,0,cx,cy,w*0.095);
    cloud.addColorStop(0,"#fff");cloud.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=cloud;ctx.fillRect(cx-w*0.1,cy-w*0.1,w*0.2,w*0.2);
  }ctx.restore();
  const sunX=w*0.79,sunY=h*0.20;
  const glow=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,h*0.21);
  glow.addColorStop(0,"rgba(255,246,203,0.32)");
  glow.addColorStop(1,"rgba(255,250,230,0)");
  ctx.fillStyle=glow;ctx.fillRect(sunX-h*0.22,sunY-h*0.22,h*0.44,h*0.44);

  // Horizon remains continuous; the shore becomes visible as we approach.
  ctx.fillStyle="#266b84";ctx.fillRect(0,horizon,w,h-horizon);
  const coast = ease((t-0.12)/0.39);
  if(coast>0) {
    ctx.save();ctx.globalAlpha=coast;
    const shoreY=horizon+h*(0.015+coast*0.050);
    ctx.fillStyle="#d8c6a0";
    ctx.beginPath();ctx.moveTo(0,horizon-h*0.016);
    ctx.quadraticCurveTo(w*0.55,shoreY-h*0.055,w,shoreY);
    ctx.lineTo(w,shoreY+h*0.06);ctx.lineTo(0,shoreY+h*0.025);ctx.fill();
    ctx.fillStyle="#806f54";
    for(let k=0;k<7;k++){
      const sx=w*((k*0.131+0.09)%1),sy=horizon-h*(0.005+(k%3)*0.007);
      ctx.fillRect(sx,sy,h*0.003,h*0.011);
    }
    ctx.restore();
  }
  const sea=ctx.createLinearGradient(0,horizon,0,h);
  sea.addColorStop(0,"rgba(21,86,114,0.88)");
  sea.addColorStop(0.55,"rgba(10,75,103,0.86)");
  sea.addColorStop(1,"#063d60");
  ctx.fillStyle=sea;ctx.fillRect(0,horizon,w,h-horizon);
  for(let i=0;i<110;i++){
    const z=(i+0.5)/110,depth=z*z;
    const y=horizon+depth*(h-horizon);
    const dx=(Math.sin(i*13.17+elapsed*1.0)*0.5+0.5)*w;
    const length=(0.004+depth*0.072)*w;
    ctx.strokeStyle=`rgba(192,220,215,${0.035+0.19*depth})`;
    ctx.lineWidth=Math.max(0.5,depth*2.1);
    ctx.beginPath();ctx.moveTo(dx,y);
    ctx.quadraticCurveTo(dx+length*0.5,y-1.5,dx+length,y);ctx.stroke();
  }

  // Camera is wide until late approach: a small distant sunbather only
  // becomes a huge target AFTER the heading was locked.
  if(coast>0.02){
    const approach=ease((t-0.33)/0.64);
    const zoom=0.09+approach*9.2;
    const yaw=difference(angle,0.19)*2*Math.PI;
    const cx=w*(0.51-yaw*0.23*approach);
    const cy=h*(0.54+approach*0.21);
    ctx.save();ctx.translate(cx,cy);ctx.scale(zoom,zoom);
    const rr=Math.min(w,h);
    const unit=rr*0.12;
    // Reclining adult from a low, foreshortened viewpoint.
    const face=ctx.createRadialGradient(-unit*0.28,-unit*0.3,unit*0.08,
      0,0,unit*1.4);
    face.addColorStop(0,"#f0c4a1");face.addColorStop(0.7,"#c18a6c");
    face.addColorStop(1,"#775048");
    ctx.fillStyle="#473b34";
    ctx.beginPath();ctx.ellipse(0,unit*0.01,unit*0.93,unit*1.16,-0.12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=face;
    ctx.beginPath();ctx.ellipse(0,unit*0.12,unit*0.77,unit*1.01,-0.11,0,Math.PI*2);ctx.fill();
    // Brow, closed eyes, projecting nose and a slightly opened mouth.
    ctx.strokeStyle="#8b6257";ctx.lineWidth=unit*0.043;
    ctx.beginPath();ctx.moveTo(-unit*0.48,-unit*0.14);
    ctx.quadraticCurveTo(-unit*0.27,-unit*0.19,-unit*0.06,-unit*0.10);
    ctx.moveTo(unit*0.12,-unit*0.14);ctx.quadraticCurveTo(unit*0.35,-unit*0.2,
      unit*0.54,-unit*0.14);ctx.stroke();
    const nose=ctx.createRadialGradient(-unit*0.10,unit*0.12,unit*0.02,
      0,unit*0.26,unit*0.42);
    nose.addColorStop(0,"#edb897");nose.addColorStop(1,"#a46c59");
    ctx.fillStyle=nose;
    ctx.beginPath();ctx.ellipse(0,unit*0.23,unit*0.28,unit*0.36,0,0,Math.PI*2);ctx.fill();
    for(const side of [-1,1]){
      ctx.fillStyle="#44252b";ctx.beginPath();
      ctx.ellipse(side*unit*0.13,unit*0.47,unit*0.077,unit*0.043,
        side*0.18,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle="#6a3034";ctx.beginPath();
    ctx.ellipse(0,unit*0.77,unit*0.25,unit*0.075,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(243,190,166,0.65)";
    ctx.lineWidth=unit*0.026;ctx.beginPath();
    ctx.ellipse(0,unit*0.78,unit*0.25,unit*0.072,0,Math.PI,Math.PI*2);ctx.stroke();
    ctx.restore();
  }

  if(phase==="power" || phase==="angle"){
    const bx=w*0.5, by=h*0.78, size=Math.min(w,h)*0.067;
    ctx.save();ctx.translate(bx,by);
    ctx.rotate(-Math.PI/2+angle*Math.PI*2);
    ctx.fillStyle="#26366a";ctx.strokeStyle="#7ad0cf";ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(-size*0.35,-size*0.33);
    ctx.quadraticCurveTo(-size*0.12,0,-size*0.35,size*0.33);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
  }
  if(phase==="flight"){
    const size=Math.min(w,h)*0.035*(1-t*0.82);
    const sx=w*0.50,sy=h*(0.77-t*0.22);
    ctx.save();ctx.translate(sx,sy);ctx.rotate(-Math.PI/2+angle*Math.PI*2);
    ctx.fillStyle="#3b60a0";ctx.strokeStyle="#94e3dc";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(-size*0.65,-size*0.48);
    ctx.lineTo(-size*0.25,0);ctx.lineTo(-size*0.65,size*0.48);
    ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
  if(phase==="result" && hit) {
    ctx.fillStyle="rgba(2,12,18,0.24)";ctx.fillRect(0,0,w,h);
  }
}

export function ReentryStage2Prototype({ onClose }: { onClose: () => void }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [phase,setPhase]=useState<DemoPhase>("power");
  const [powerOscillator,setPowerOscillator]=useState(0.5);
  const [lockedPowerNorm,setLockedPowerNorm]=useState<number|null>(null);
  const [angleNorm,setAngleNorm]=useState(0.19);
  const [hit,setHit]=useState<Hit>(null);
  const [notice,setNotice]=useState(false);
  const elapsedRef=useRef(0);
  const startRef=useRef(0);
  const phaseRef=useRef(phase);
  const angleRef=useRef(angleNorm);
  const powerRef=useRef(lockedPowerNorm ?? 0.5);
  const hitRef=useRef(hit);
  useEffect(()=>{
    phaseRef.current=phase;
    angleRef.current=angleNorm;
    powerRef.current=lockedPowerNorm ?? 0.5;
    hitRef.current=hit;
  },[phase,angleNorm,lockedPowerNorm,hit]);

  useEffect(()=>{
    if(phase!=="power")return;
    const id=window.setInterval(()=>{
      const v=(Math.sin(performance.now()/1350)+1)/2;
      setPowerOscillator(v);
    },90);
    return ()=>window.clearInterval(id);
  },[phase]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    let raf=0,last=0;
    const tick=(now:number)=>{
      const p=phaseRef.current;
      if(last===0)last=now;
      const dt=Math.min(50,Math.max(0,now-last));
      last=now;
      if(p==="flight"){
        elapsedRef.current=Math.min(DURATION_S,elapsedRef.current+dt/1000);
        if(elapsedRef.current>=DURATION_S){
          const a=angleRef.current;
          const power=powerRef.current;
          const eligible=power>0.24&&power<0.84;
          const target:Hit=eligible && Math.abs(difference(a,0.165))<0.015
            ? "NOSE" : eligible && Math.abs(difference(a,0.217))<0.023
            ? "MOUTH" : null;
          setHit(target);setPhase("result");
        }
      }
      const rect=canvas.getBoundingClientRect();
      const w=Math.max(1,Math.round(rect.width));
      const h=Math.max(1,Math.round(rect.height));
      const dpr=Math.min(1.5,window.devicePixelRatio||1);
      const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
      if(canvas.width!==pw||canvas.height!==ph){
        canvas.width=pw;canvas.height=ph;
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      drawStage2(ctx,w,h,elapsedRef.current,p,angleRef.current,powerRef.current,hitRef.current);
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[]);

  const lockPower=useCallback(()=>{
    if(phase!=="power")return;
    setLockedPowerNorm(powerOscillator);setPhase("angle");
  },[phase,powerOscillator]);
  const launch=useCallback(()=>{
    if(phase!=="angle")return;
    elapsedRef.current=0;setHit(null);setPhase("flight");
  },[phase]);
  const retry=()=>{
    elapsedRef.current=0;setLockedPowerNorm(null);setAngleNorm(0.19);
    setHit(null);setNotice(false);setPhase("power");
  };

  return (
    <div className="absolute inset-0 z-[90] overflow-hidden bg-[#03151b] text-white" role="region" aria-label="Stage 2 beach approach prototype">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Sea horizon, approaching beach, and a sunbather target"/>
      <div className="pointer-events-none absolute left-5 top-5 rounded-sm border border-white/25 bg-black/35 px-3 py-2 text-[0.7rem] tracking-[0.19em] sm:left-7">
        STAGE 2 <span className="ml-2 text-white/55">PROTOTYPE</span>
      </div>
      <button type="button" onClick={onClose}
        className="absolute right-5 top-5 z-[95] rounded-sm border border-white/40 bg-[#071b24]/80 px-3 py-2 text-[0.7rem] tracking-[0.13em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-100">
        BACK
      </button>
      <ReentryLaunchControls
        phase={phase}
        powerOscillator={powerOscillator}
        lockedPowerNorm={lockedPowerNorm}
        angleNorm={angleNorm}
        onLockPower={lockPower}
        onLaunch={launch}
        onNudgeAngle={(delta)=>setAngleNorm(v=>wrap(v+delta))}
      />
      {phase==="flight"&& (
        <p className="pointer-events-none absolute inset-x-0 top-[13%] text-center text-[0.59rem] tracking-[0.18em] text-white/65">
          COAST APPROACH · HEADING LOCKED
        </p>
      )}
      {phase==="result"&& (
        <div className="absolute inset-x-0 bottom-[8%] z-[94] flex flex-col items-center gap-3 px-5 text-center">
          <p className="rounded-sm bg-[#03141b]/75 px-5 py-3 text-sm tracking-[0.21em]">
            {hit?"STAGE 2 CLEAR":"TARGET MISSED"}
          </p>
          {hit&&<p className="text-[0.65rem] tracking-[0.15em] text-white/80">ENTRY: {hit}</p>}
          <div className="flex gap-4">
            {hit&&<button type="button" onClick={()=>setNotice(v=>!v)}
              className="rounded-sm border border-white/40 bg-black/60 px-4 py-2 text-xs tracking-widest">STAGE 3</button>}
            <button type="button" onClick={retry}
              className="rounded-sm border border-white/40 bg-black/60 px-4 py-2 text-xs tracking-widest">RETRY</button>
          </div>
          {notice&&<p className="text-xs tracking-widest text-white/80">STAGE 3 — COMING SOON</p>}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[0.52rem] tracking-[0.14em] text-white/50">
        VISUAL / AIMING PROTOTYPE — NOT FINAL PHYSICS
      </div>
    </div>
  );
}
