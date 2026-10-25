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
  // The background is a permanent celestial sphere. It never fades away,
  // even when the nearby galaxy and planets shrink to single light points.
  const skyStars=Array.from({length:1950},(_,i)=>({
    x:rnd(i*11+17), y:rnd(i*17+37),
    radius:.34+rnd(i*13+47)*1.10,
    hue:[205,211,221,240,26,36,49,287][i%8],
    power:.22+rnd(i*7+113)*.64,
    phase:rnd(i*23+19)*TAU,
  }));
  const skyBright=Array.from({length:75},(_,i)=>({
    x:rnd(i*31+251),y:rnd(i*43+91),
    radius:.8+rnd(i*11+117)*.85,
    hue:[210,222,42,36,255,194][i%6],
    power:.48+rnd(i*13+61)*.34,
    phase:rnd(i*17+129)*TAU,
  }));
  let skyCache:HTMLCanvasElement|null=null;
  let cachedWidth=0,cachedHeight=0;
  let nebulaCache:HTMLCanvasElement|null=null;

  function ensureSky(w:number,h:number) {
    if(skyCache && cachedWidth===w && cachedHeight===h)return skyCache;
    cachedWidth=w;cachedHeight=h;
    const c=document.createElement("canvas");
    // Render a consistent dense sky without reallocating on every click.
    c.width=Math.max(1,Math.round(w));
    c.height=Math.max(1,Math.round(h));
    const g=c.getContext("2d");
    if(!g)return c;
    for(const p of skyStars){
      const x=p.x*w,y=p.y*h;
      g.fillStyle="hsla("+p.hue+",43%,87%,"+p.power.toFixed(3)+")";
      g.beginPath();g.arc(x,y,p.radius,0,TAU);g.fill();
    }
    for(const p of skyBright){
      const x=p.x*w,y=p.y*h;
      const radius=p.radius*8;
      const halo=g.createRadialGradient(x,y,0,x,y,radius);
      halo.addColorStop(0,"hsla("+p.hue+",63%,84%,"+(p.power*.32).toFixed(3)+")");
      halo.addColorStop(.26,"hsla("+p.hue+",61%,68%,"+(p.power*.12).toFixed(3)+")");
      halo.addColorStop(1,"hsla("+p.hue+",56%,57%,0)");
      g.fillStyle=halo;
      g.beginPath();g.arc(x,y,radius,0,TAU);g.fill();
      g.fillStyle="hsla("+p.hue+",28%,95%,"+p.power.toFixed(3)+")";
      g.beginPath();g.arc(x,y,p.radius,0,TAU);g.fill();
    }
    skyCache=c;
    return c;
  }

  function ensureNebula(){
    if(nebulaCache)return nebulaCache;
    // High-resolution, completely transparent radial image. Unlike the old
    // star rectangles and mathematical spiral lines, thousands of irregular
    // dust clouds and stars form the *same* three-dimensional-looking region.
    // The changing view is just a zoom of this already-present source.
    const n=1120;
    const c=document.createElement("canvas");
    c.width=c.height=n;
    const g=c.getContext("2d",{alpha:true});
    if(!g)return c;
    const middle=n/2;
    g.save();g.translate(middle,middle);
    g.scale(1,.66);
    const haze=g.createRadialGradient(0,0,0,0,0,n*.47);
    haze.addColorStop(0,"rgba(204,203,233,.23)");
    haze.addColorStop(.12,"rgba(159,167,208,.13)");
    haze.addColorStop(.35,"rgba(85,112,175,.095)");
    haze.addColorStop(.80,"rgba(43,77,127,.025)");
    haze.addColorStop(1,"rgba(27,50,96,0)");
    g.fillStyle=haze;
    g.beginPath();g.arc(0,0,n*.47,0,TAU);g.fill();
    g.restore();

    // Deliberately broken spiral: asymmetric branches, dust lanes and an
    // uneven light envelope prevent a white dotted pinwheel appearance.
    for(let i=0;i<1250;i++){
      const radial=Math.sqrt(rnd(i*37+191))*.92;
      const arm=i%4;
      const theta=arm*TAU/4+radial*4.75+
        (rnd(i*71+51)-.5)*(.42+.45*radial);
      const cx=middle+Math.cos(theta)*radial*n*.42;
      const cy=middle+Math.sin(theta)*radial*n*.27;
      const rad=5+rnd(i*17+109)*22;
      const q=g.createRadialGradient(cx,cy,0,cx,cy,rad);
      const blue=i%9<6;
      q.addColorStop(0,blue?"rgba(143,166,221,.080)":"rgba(240,176,191,.066)");
      q.addColorStop(1,"rgba(85,110,160,0)");
      g.fillStyle=q;
      g.beginPath();g.arc(cx,cy,rad,0,TAU);g.fill();
    }
    // Stars are much less orderly than the old four perfect spiral tracks:
    // 40% are in the diffuse elliptical disc, the rest clustered along the
    // irregular arms. A radial limit softly blends away the last pixels.
    for(let i=0;i<19500;i++){
      const radial=Math.sqrt(rnd(i*23+23))*.94;
      const diffuse=rnd(i*61+17)<.46;
      const arm=i%4;
      const theta=diffuse
        ?rnd(i*41+27)*TAU
        :arm*TAU/4+radial*4.75+(rnd(i*53+79)-.5)*(.35+.65*radial);
      const wobble=(rnd(i*73+33)-.5)*.10;
      const x=middle+Math.cos(theta)*(radial+wobble)*n*.43;
      const y=middle+Math.sin(theta)*(radial+wobble)*n*.275;
      const alpha=(.18+.62*rnd(i*19+47))*
        (diffuse?.52:1)*(1-smooth((radial-.73)/.27));
      const hue=[210,218,232,250,275,328,32,39][i%8];
      g.fillStyle="hsla("+hue+",38%,"+(76+Math.round(rnd(i*13+17)*17))+"%,"+alpha.toFixed(3)+")";
      g.beginPath();
      g.arc(x,y,.22+rnd(i*29+31)*1.18,0,TAU);g.fill();
    }
    // Soft luminous nucleus with a faint surrounding bulge.
    const core=g.createRadialGradient(middle,middle,0,middle,middle,n*.075);
    core.addColorStop(0,"rgba(255,244,242,.89)");
    core.addColorStop(.17,"rgba(227,212,235,.60)");
    core.addColorStop(.54,"rgba(152,152,205,.21)");
    core.addColorStop(1,"rgba(95,121,180,0)");
    g.fillStyle=core;
    g.beginPath();g.arc(middle,middle,n*.075,0,TAU);g.fill();
    nebulaCache=c;
    return c;
  }

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

  function drawSky(ctx:CanvasRenderingContext2D,now:number,w:number,h:number) {
    const sky=ensureSky(w,h);
    // Complete edge-to-edge coverage from the first moment to the last.
    ctx.drawImage(sky,0,0,w,h);
    for(const p of skyBright) {
      const x=p.x*w,y=p.y*h;
      const flicker=.84+.16*Math.sin(now*.00065+p.phase);
      ctx.fillStyle="hsla("+p.hue+",35%,96%,"+(p.power*flicker).toFixed(3)+")";
      ctx.beginPath();
      ctx.arc(x,y,p.radius*.72,0,TAU);ctx.fill();
    }
  }

  function drawDistantGalaxy(ctx:CanvasRenderingContext2D,step:number,w:number,h:number) {
    // A field of stars fills the view while the vessel looks backward. The
    // field slowly resolves into a spiral as its angular extent contracts.
    // There are no appearing images, separate star rectangles, or fade cuts.
    const short=Math.min(w,h);
    const recession=Math.max(0,step-30);
    const r=short*3.2*Math.exp(-.046*recession-.070*Math.max(0,step-129));
    const x=w*.53,y=h*.48;
    if(r<.40){
      ctx.fillStyle="rgba(220,223,250,.82)";
      ctx.beginPath();ctx.arc(x,y,.72,0,TAU);ctx.fill();
      return;
    }
    const texture=ensureNebula();
    const alpha=.095+.88*smooth((step-30)/84);
    ctx.save();
    ctx.globalCompositeOperation="screen";
    ctx.globalAlpha=alpha;
    // Texture always has the same stars and positions. The transparent
    // boundary and nebula's radial dust mask leave the permanent sky visible.
    ctx.drawImage(texture,x-r,y-r,r*2,r*2);
    ctx.restore();
  }

  return {
    drawSky,
    drawForeground(ctx:CanvasRenderingContext2D,step:number,w:number,h:number) {
      // Different off-axis worlds remain in fixed positions behind the ship.
      if(step>=31) for(let k=bodies.length-1;k>=0;k--)body(ctx,bodies[k],step,w,h);
    },
    drawGalaxy(ctx:CanvasRenderingContext2D,step:number,w:number,h:number) {
      drawDistantGalaxy(ctx,step,w,h);
    },
  };
}
