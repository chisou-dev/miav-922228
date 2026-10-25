/**
 * Continuous rear-window view for MIAV's imaginary spaceship journey.
 *
 * The vessel travels AWAY from the local planetary system while the camera
 * looks BACK at fixed objects. Their angular diameter decreases with distance.
 * Edge-clipped planets slide *into* view as the field of view opens behind us;
 * they then shrink, never suddenly stop or reverse. The same star population
 * gradually resolves from a bright edge of sky into a distant Milky-Way-like
 * disc. Planet and galaxy distances are cinematic, not an astronomical map.
 */
type Kind = "jovian" | "storm" | "ice" | "rock" | "cloud";
type Side = "left" | "right" | "top" | "bottom";
type Body = {
  id: number; peek: number; depth: number; radius: number;
  side: Side; transverse: number; kind: Kind; hue: number;
  ring?: boolean; moon?: boolean;
};
type Spark = {
  x: number; y: number; z: number; u: number; v: number;
  radius: number; hue: number; power: number; phase: number;
};
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (v: number) => { const t=clamp(v,0,1);return t*t*(3-2*t); };
function rnd(n: number) {
  let v = Math.imul(n + 1, 0x9e3779b1) >>> 0;
  v = Math.imul(v ^ (v >>> 16), 0x85ebca6b) >>> 0;
  v = Math.imul(v ^ (v >>> 13), 0xc2b2ae35) >>> 0;
  return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
}
function rgb(h: number,s: number,l: number) {
  const a=s*Math.min(l,1-l);
  const k=(n:number)=>(n+h/30)%12;
  const f=(n:number)=>Math.round(255*(l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1))));
  return [f(0),f(8),f(4)] as const;
}
function retreat(step: number) {
  const s=Math.max(0,step-31);
  const back=92*(Math.exp(s*0.043)-1);
  // Once the entire galaxy is in view, continue moving AWAY, faster at huge
  // scale, until the SAME distant object is only a pinprick.
  return back*(step>145?Math.pow(1.21,step-145):1);
}
const bodies: Body[] = [
  {id:1,peek:32,depth:105,radius:20,side:"right",transverse:.37,kind:"jovian",hue:27},
  {id:2,peek:45,depth:155,radius:23,side:"left",transverse:.72,kind:"ice",hue:202},
  {id:3,peek:55,depth:230,radius:24,side:"top",transverse:.64,kind:"storm",hue:13},
  {id:4,peek:65,depth:270,radius:29,side:"right",transverse:.73,kind:"jovian",hue:32,ring:true},
  {id:5,peek:67,depth:284,radius:6,side:"right",transverse:.53,kind:"rock",hue:212,moon:true},
  {id:6,peek:75,depth:330,radius:15,side:"bottom",transverse:.26,kind:"rock",hue:20},
  {id:7,peek:84,depth:375,radius:24,side:"left",transverse:.31,kind:"cloud",hue:182},
  {id:8,peek:91,depth:430,radius:21,side:"top",transverse:.22,kind:"ice",hue:235},
  {id:9,peek:98,depth:485,radius:27,side:"bottom",transverse:.78,kind:"jovian",hue:41},
];

export function createGalaxyFlightScene() {
  const textures = new Map<number, HTMLCanvasElement>();
  // The field is seeded once. Nothing is newly generated at a stage boundary.
  const background = Array.from({length:1900},(_,i):Spark=>({
    x:(rnd(i*11+17)-.5)*4200,
    y:(rnd(i*17+11)-.5)*2500,
    z:450+rnd(i*19+33)*8000,
    u:0,v:0,radius:.32+rnd(i*37+9)*1.02,
    hue:[200,210,222,245,34,42,7,285][i%8],
    power:.21+rnd(i*7+18)*.64,
    phase:rnd(i*13+97)*TAU,
  }));

  // A single physical spiral population ALWAYS exists beyond the planetary
  // system. Seen from nearby, one only glimpses its star-rich OUTER EDGE at
  // the right. Backing away reveals the remaining arms and nucleus gradually.
  const disk=Array.from({length:2600},(_,i):Spark=>{
    const r=Math.sqrt((i+.5)/2600);
    const a=i%4*TAU/4+r*5.9+(rnd(i*71+33)-.5)*(.23+.32*r);
    const scatter=.045*(rnd(i*17+113)-.5);
    return {
      x:0,y:0,z:0,
      u:r*Math.cos(a)+scatter,
      v:r*Math.sin(a)*.62+(rnd(i*23+41)-.5)*.030,
      radius:.35+rnd(i*61+9)*.90,
      hue:[208,222,242,265,305,340,34,42][i%8],
      power:.19+rnd(i*31+7)*.79,
      phase:rnd(i*29+61)*TAU,
    };
  });

  function texturedWorld(world:Body): HTMLCanvasElement {
    const old=textures.get(world.id);
    if(old)return old;
    const n=328;
    const c=document.createElement("canvas");
    c.width=c.height=n;
    const g=c.getContext("2d",{alpha:true});
    if(!g)return c;
    const data=g.createImageData(n,n);
    const pixels=data.data;
    const seed=world.id*2.41;
    // Whole surface is rendered once. Lighting comes from the upper left;
    // layered storms vary with spherical longitude rather than stripes drawn
    // across the flat screen.
    for(let py=0;py<n;py++){
      const v=(py-n*.5)/(n*.485);
      for(let px=0;px<n;px++){
        const u=(px-n*.5)/(n*.485);
        const squared=u*u+v*v;
        const o=(py*n+px)*4;
        if(squared>=1)continue;
        const z=Math.sqrt(1-squared);
        const lon=Math.atan2(u,Math.max(.035,z));
        const lat=Math.asin(clamp(v,-1,1));
        const f1=Math.sin(lon*6.3+lat*17+seed)*Math.cos(lat*3);
        const f2=Math.sin(lon*18.7-lat*32+seed*2.8);
        const f3=Math.cos(lon*41.4+lat*61+seed*1.6);
        const curl=lat+.065*Math.sin(lon*6.1+f2*.3+seed)+.023*f3;
        const belt=Math.sin(curl*25.5+f1*.8)+.44*Math.sin(curl*61+lon*5);
        let hue=world.hue, sat=.44,lum=.56;
        if(world.kind==="jovian"||world.kind==="storm"){
          hue+=12*f1+6*f2;
          sat=clamp(.40+.10*belt+.06*f3,.23,.67);
          lum=clamp(.58+.13*belt+.07*f2+.027*f3,.25,.85);
          // A rotating Jupiter-like vortex (elliptical storm cell with
          // curved bands). It is not just a uniformly striped coloured ball.
          const sx=u+.26, sy=v-.24;
          const stormCell=(sx*sx)/(.26*.26)+(sy*sy)/(.15*.15);
          if(stormCell<1.25){
            const fade=1-smooth(stormCell/1.25);
            const swirl=Math.cos(Math.atan2(sy,sx)*2.3+4*Math.hypot(sx,sy));
            hue=hue*(1-fade*.7)+16*fade*.7;
            lum=lum*(1-fade*.63)+(.48+.08*swirl)*fade*.63;
            sat+=fade*.13;
          }
        }else if(world.kind==="rock"){
          const tectonic=Math.sin(lon*13+lat*21+seed)+
            .62*Math.cos(lon*37-lat*29)+.23*f3;
          let crater=0;
          for(let k=0;k<5;k++){
            const cx=Math.sin(seed*4+k*6.2)*.68;
            const cy=Math.cos(seed*3+k*5.4)*.65;
            const rad=Math.hypot(u-cx,v-cy);
            crater+=.10*Math.exp(-Math.pow((rad-(.08+k*.017))/.018,2));
            crater-=.10*Math.exp(-Math.pow(rad/(.06+k*.012),2));
          }
          hue+=11*tectonic;
          sat=.20+.08*tectonic;
          lum=.47+.15*tectonic+crater;
        }else{
          const flow=Math.sin(lat*43+lon*7+f2*.7);
          hue+=7*f1;
          sat=.36+.08*flow;
          lum=.53+.10*flow+.06*f2;
        }
        const illumination=clamp(.13+.86*Math.max(0,z*.84-u*.29-v*.38),.08,1);
        const limb=smooth((1-squared)*18);
        const [r,gc,b]=rgb((hue+360)%360,clamp(sat,.1,.8),clamp(lum,.11,.9));
        pixels[o]=Math.round(r*illumination);
        pixels[o+1]=Math.round(gc*illumination);
        pixels[o+2]=Math.round(b*illumination);
        pixels[o+3]=Math.round(255*limb);
      }
    }
    g.putImageData(data,0,0);
    textures.set(world.id,c);
    return c;
  }

  function projection(body:Body,step:number,w:number,h:number) {
    const focus=Math.min(w,h)*.89;
    // Place each body where a portion of its limb is already barely visible
    // at its individual "peek" distance. It is never opacity-spawned.
    const depthAtPeek=body.depth+retreat(body.peek);
    const margin=.80*body.radius;
    let wx=0,wy=0;
    if(body.side==="right"||body.side==="left"){
      wx=(body.side==="right"?1:-1)*(w*.5*depthAtPeek/focus+margin);
      wy=(body.transverse-.5)*h*depthAtPeek/focus;
    }else{
      wy=(body.side==="bottom"?1:-1)*(h*.5*depthAtPeek/focus+margin);
      wx=(body.transverse-.5)*w*depthAtPeek/focus;
    }
    const distance=body.depth+retreat(step);
    return {
      x:w/2+focus*wx/distance,
      y:h/2+focus*wy/distance,
      r:focus*body.radius/distance,
      distance,
    };
  }

  function body(ctx:CanvasRenderingContext2D,world:Body,step:number,w:number,h:number) {
    const {x,y,r}=projection(world,step,w,h);
    // Conservative culling: the world is allowed to slide in from OFFSCREEN;
    // no alpha pop or instant transition at an arbitrary tick number.
    if(r<.22||x+r*1.8<0||x-r*1.8>w||y+r*1.8<0||y-r*1.8>h)return;
    if(r<1.6){
      ctx.fillStyle="hsla("+world.hue+",38%,79%,.38)";
      ctx.beginPath();ctx.arc(x,y,Math.max(.3,r),0,TAU);ctx.fill();
      return;
    }
    if(world.ring&&r>4){
      ctx.strokeStyle="hsla("+world.hue+",32%,71%,.38)";
      ctx.lineWidth=Math.max(.8,r*.10);
      ctx.beginPath();ctx.ellipse(x,y,r*1.77,r*.39,-.22,Math.PI,TAU);ctx.stroke();
    }
    ctx.drawImage(texturedWorld(world),x-r,y-r,r*2,r*2);
    if(world.ring&&r>4){
      ctx.strokeStyle="hsla("+world.hue+",36%,82%,.57)";
      ctx.lineWidth=Math.max(.8,r*.11);
      ctx.beginPath();ctx.ellipse(x,y,r*1.77,r*.39,-.22,0,Math.PI);ctx.stroke();
    }
  }

  function distantStars(ctx:CanvasRenderingContext2D,step:number,now:number,w:number,h:number) {
    const focus=Math.min(w,h)*.89;
    const back=retreat(step);
    const entrance=smooth((step-26)/18);
    if(entrance<=0)return;
    for(const st of background){
      const z=st.z+back;
      const x=w*.5+focus*st.x/z;
      const y=h*.5+focus*st.y/z;
      if(x<0||x>w||y<0||y>h)continue;
      const a=entrance*st.power*(.83+.17*Math.sin(now*.00053+st.phase));
      ctx.fillStyle="hsla("+st.hue+",48%,85%,"+a.toFixed(3)+")";
      ctx.beginPath();ctx.arc(x,y,st.radius,0,TAU);ctx.fill();
    }
  }

  function galaxy(ctx:CanvasRenderingContext2D,step:number,now:number,w:number,h:number) {
    const focus=Math.min(w,h)*.89;
    const initialDistance=250+retreat(112);
    // A fixed world-space centre lies outside the RIGHT edge until the
    // field of view widens enough to catch its outermost stars.
    const span=Math.min(w,h*1.5);
    const cxWorld=initialDistance*w/focus*.68;
    const worldRadius=initialDistance*span/focus*.29;
    const dyWorld=-initialDistance*h/focus*.06;
    const distance=250+retreat(step);
    const x=w*.5+cxWorld*focus/distance;
    const y=h*.5+dyWorld*focus/distance;
    const r=worldRadius*focus/distance;
    if(x-r>w+4||x+r<0||y-r*.75>h||y+r*.75<0)return;

    ctx.save();
    // The same stellar density is seen closer first; as it shrinks the viewer
    // recognizes it as the outer disk of a spiral, then its complete shape.
    // There is NO galaxy picture, fade-in time or rotation after formation.
    ctx.globalCompositeOperation="screen";
    if(r>1.6){
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(1,.66);
      const halo=ctx.createRadialGradient(0,0,0,0,0,Math.max(r,1));
      halo.addColorStop(0,"rgba(210,184,232,.10)");
      halo.addColorStop(.35,"rgba(105,105,194,.075)");
      halo.addColorStop(.76,"rgba(57,92,158,.038)");
      halo.addColorStop(1,"rgba(36,53,124,0)");
      ctx.fillStyle=halo;
      ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
      ctx.restore();
    }
    for(const st of disk){
      const px=x+st.u*r, py=y+st.v*r;
      if(px<0||px>w||py<0||py>h)continue;
      const glimmer=.87+.13*Math.sin(now*.00047+st.phase);
      const opacity=st.power*glimmer;
      ctx.fillStyle="hsla("+st.hue+",51%,84%,"+opacity.toFixed(3)+")";
      ctx.beginPath();
      const size=Math.max(.26,st.radius*Math.min(1,r/65));
      ctx.arc(px,py,size,0,TAU);
      ctx.fill();
    }
    if(r>2){
      const core=ctx.createRadialGradient(x,y,0,x,y,r*.13);
      core.addColorStop(0,"rgba(255,237,245,.48)");
      core.addColorStop(.36,"rgba(194,169,236,.23)");
      core.addColorStop(1,"rgba(115,115,183,0)");
      ctx.fillStyle=core;
      ctx.beginPath();ctx.arc(x,y,r*.13,0,TAU);ctx.fill();
    }else{
      ctx.fillStyle="rgba(220,214,255,.7)";
      ctx.beginPath();ctx.arc(x,y,.8,0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  return {
    draw(ctx:CanvasRenderingContext2D,step:number,now:number,w:number,h:number) {
      // Nothing changes position on a timer except star scintillation:
      // tap count is the only camera control.
      distantStars(ctx,step,now,w,h);
      galaxy(ctx,step,now,w,h);
      // Distant bodies behind nearer ones; no planet tunnel or tidy ring.
      if(step>=31){
        for(let k=bodies.length-1;k>=0;k--)body(ctx,bodies[k],step,w,h);
      }
    },
  };
}
