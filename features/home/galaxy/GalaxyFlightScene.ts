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
type Kind = "jovian" | "storm" | "vortex" | "ice" | "rock" | "cloud" | "sun";
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
  // By the time the distant star cloud starts contracting, all worlds have
  // diminished to pinpoints. Never show a full spiral beside large planets.
  const planetaryRetreat = 1 + 4.0*smooth((step-103)/27);
  return back*planetaryRetreat*(step>178?Math.pow(1.17,step-178):1);
}
const bodies: Body[] = [
  {id:1,peek:32,depth:106,radius:29,side:"right",transverse:.34,kind:"jovian",hue:28},
  {id:2,peek:44,depth:185,radius:13,side:"left",transverse:.78,kind:"ice",hue:209},
  {id:3,peek:54,depth:235,radius:28,side:"top",transverse:.66,kind:"vortex",hue:214},
  {id:4,peek:65,depth:285,radius:22,side:"right",transverse:.68,kind:"jovian",hue:34,ring:true,moon:true},
  {id:5,peek:67,depth:290,radius:5,side:"right",transverse:.49,kind:"rock",hue:212,moon:true},
  {id:6,peek:74,depth:337,radius:10,side:"bottom",transverse:.23,kind:"rock",hue:17},
  {id:7,peek:82,depth:399,radius:18,side:"left",transverse:.31,kind:"cloud",hue:46},
  {id:8,peek:89,depth:447,radius:8,side:"top",transverse:.24,kind:"sun",hue:36},
  {id:9,peek:97,depth:509,radius:20,side:"bottom",transverse:.84,kind:"rock",hue:42},
];

export function createGalaxyFlightScene() {
  const textures = new Map<number, HTMLCanvasElement>();
  // The distant stars never migrate toward the screen centre. Their fixed
  // bearings persist for the whole trip; the viewer simply pulls farther
  // away from a pre-existing, much larger star system.
  const SKY_STARS=1370;
  const DEEP_STARS=570;
  // Exact early counts requested: tap 2 = 10, tap 3 = 30, tap 5 = 100.
  // The same deterministic star identities persist throughout the voyage.
  const countStops: readonly [number, number][] = [
    [0,0],[1,3],[2,10],[3,30],[4,60],[5,100],
    [8,250],[12,630],[18,1150],[22,SKY_STARS]
  ];
  function visibleStarCount(step:number){
    for(let k=1;k<countStops.length;k++){
      const [end,total]=countStops[k];
      if(step<=end){
        const [start,previous]=countStops[k-1];
        return previous+(total-previous)*clamp((step-start)/(end-start),0,1);
      }
    }
    return SKY_STARS;
  }
  const skyStars=Array.from({length:SKY_STARS},(_,i)=>({
    x:rnd(i*11+17),y:rnd(i*17+37),
    radius:.31+rnd(i*13+47)*.86,
    hue:[204,212,223,239,31,40,50,285][i%8],
    power:.19+rnd(i*7+113)*.57,
    phase:rnd(i*23+19)*TAU,
  }));
  const skyBright=Array.from({length:34},(_,i)=>({
    x:rnd(i*31+251),y:rnd(i*43+91),
    radius:.55+rnd(i*11+117)*.79,
    hue:[205,222,42,36,255,194][i%6],
    power:.42+rnd(i*13+61)*.37,
    phase:rnd(i*17+129)*TAU,
  }));
  // Much fainter, fixed, separately distributed points become resolvable
  // at intergalactic distances. They never inherit spiral coordinates.
  const deepStars=Array.from({length:DEEP_STARS},(_,i)=>({
    x:rnd(i*29+110017),y:rnd(i*37+170043),
    radius:.32+rnd(i*13+70131)*.94,
    hue:[204,225,242,270,33,39,55][i%7],
    power:.25+rnd(i*19+9901)*.50,
    phase:rnd(i*23+23111)*TAU,
  }));
  let nebulaCache:HTMLCanvasElement|null=null;

  function galaxyGeometry(step:number,w:number,h:number){
    const short=Math.min(w,h);
    // A single immense, already-existing galactic disc is initially far
    // larger than the window. With each outward tap MORE of its perimeter
    // fits the view. Nothing assembles from stars travelling to one point.
    const framing=smooth((step-151)/54);
    const recession=Math.max(0,step-205);
    const r=short*.245*Math.exp((1-framing)*3.3)*Math.exp(-.245*recession);
    return {x:w*.51,y:h*.49,r};
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

  function noise(x:number,y:number,seed:number){
    const ix=Math.floor(x),iy=Math.floor(y);
    const fx=x-ix,fy=y-iy;
    const wx=fx*fx*(3-2*fx),wy=fy*fy*(3-2*fy);
    const sample=(a:number,b:number)=>
      rnd(Math.imul(a,1619)^Math.imul(b,31337)^Math.imul(seed,6971));
    const lo=sample(ix,iy)*(1-wx)+sample(ix+1,iy)*wx;
    const hi=sample(ix,iy+1)*(1-wx)+sample(ix+1,iy+1)*wx;
    return lo*(1-wy)+hi*wy;
  }
  function terrain(x:number,y:number,seed:number){
    let sum=0,amplitude=.56,frequency=1;
    for(let o=0;o<4;o++){
      sum+=amplitude*noise(x*frequency,y*frequency,seed+o*31);
      amplitude*=.48;frequency*=2.13;
    }
    return sum/.995;
  }

  function texturedWorld(world:Body): HTMLCanvasElement {
    const old=textures.get(world.id);
    if(old)return old;
    const n=264;
    const c=document.createElement("canvas");
    c.width=c.height=n;
    const g=c.getContext("2d",{alpha:true});
    if(!g)return c;
    const data=g.createImageData(n,n);
    const pixels=data.data;
    const seed=world.id*17;
    for(let py=0;py<n;py++){
      const v=(py-n*.5)/(n*.485);
      for(let px=0;px<n;px++){
        const u=(px-n*.5)/(n*.485);
        const squared=u*u+v*v;
        const o=(py*n+px)*4;
        if(squared>=1)continue;
        const z=Math.sqrt(1-squared);
        const lon=Math.atan2(u,Math.max(.04,z));
        const lat=Math.asin(clamp(v,-1,1));
        const broad=terrain(lon*1.4+2.4,lat*2.2+3.3,seed);
        let hue=world.hue,sat=.40,lum=.52;
        if(world.kind==="jovian"||world.kind==="storm"){
          // Fluid layers follow latitude and bend smoothly around vortices,
          // unlike high-frequency woven stripes on a spherical garment.
          const warp=(broad-.5)*.29+
            .036*Math.sin(lon*3.2+lat*5.4+seed);
          const layered=Math.sin((lat+warp)*19)+
            .42*Math.sin((lat+warp)*42+2.1*broad);
          const thin=terrain(lon*5.5+12,lat*16+7,seed+73)-.5;
          hue=world.hue+(world.kind==="storm"?13:5)*layered+thin*8;
          sat=clamp(.33+.075*layered+thin*.13,.17,.58);
          lum=clamp(.60+.15*layered+.065*thin,.29,.85);
          // Oval cyclone with a subtle rotational cloud boundary (Jupiter
          // Great-Red-Spot inspired, not a pasted circle).
          const sx=u+.28,sy=v-.24;
          const ellipse=sx*sx/(.25*.25)+sy*sy/(.13*.13);
          if(world.kind==="jovian" && ellipse<1.75){
            const swirl=Math.atan2(sy/.13,sx/.25)+
              4.6*Math.sqrt(ellipse);
            const fading=1-smooth((ellipse-.55)/1.2);
            const rim=.5+.5*Math.cos(swirl*2+ellipse*5.3);
            hue=hue*(1-fading*.7)+13*fading*.7;
            sat+=fading*.17;
            lum=lum*(1-fading*.6)+(.49+rim*.10)*fading*.6;
          }
        }else if(world.kind==="vortex"){
          // Two large cyclone systems, one cobalt-blue, one warm crimson.
          // This is fluid turbulence, not the same repeated bands used for
          // Jupiter or a clothing-like stripe texture.
          const a1=Math.atan2(v+.20,u+.24);
          const a2=Math.atan2(v-.27,u-.29);
          const d1=Math.hypot((u+.24)*1.10,(v+.20)*1.10);
          const d2=Math.hypot((u-.29)*1.12,(v-.27)*1.12);
          const swirl1=Math.sin(a1*2.3-d1*17+broad*3.3);
          const swirl2=Math.sin(a2*2.5+d2*18+broad*3.6);
          const eddies=terrain(lon*4.5+3.0,lat*5.8-1.5,seed+97)-.5;
          const redZone=.48+.29*Math.sin(lon*2.1-lat*4.0+swirl1*.58+swirl2*.38);
          const redMix=smooth((redZone-.18)/.66);
          const electric=clamp(.45+.17*swirl1+.12*swirl2+eddies*.23,.17,.80);
          const blueTone=rgb(212+eddies*23,.67,electric);
          const redTone=rgb(347+eddies*14,.67,.45+.15*swirl2);
          const illumination=clamp(.17+.82*Math.max(0,z*.85-u*.30-v*.35),.08,1);
          const limb=smooth((1-squared)*19);
          pixels[o]=Math.round((blueTone[0]*(1-redMix)+redTone[0]*redMix)*illumination);
          pixels[o+1]=Math.round((blueTone[1]*(1-redMix)+redTone[1]*redMix)*illumination);
          pixels[o+2]=Math.round((blueTone[2]*(1-redMix)+redTone[2]*redMix)*illumination);
          pixels[o+3]=Math.round(255*limb);
          continue;
        }else if(world.kind==="rock"){
          // Large irregular highlands, dry basins and small impact craters.
          // No latitudinal bands whatsoever on rocky worlds.
          const relief=terrain(lon*3.6+4,lat*3.7-3,seed)-.5;
          const sediments=terrain(lon*11+7,lat*11+9,seed+39)-.5;
          let craters=0;
          for(let k=0;k<6;k++){
            const cx=Math.sin(seed*.67+k*2.6)*.78;
            const cy=Math.cos(seed*.49+k*3.3)*.77;
            const d=Math.hypot(u-cx,v-cy);
            const rad=.045+.023*(k%3);
            craters+=.13*Math.exp(-Math.pow((d-rad)/(.013+.003*k),2));
            craters-=.15*Math.exp(-Math.pow(d/(rad*.78),2));
          }
          hue=world.hue+relief*22;
          sat=.21+relief*.13;
          lum=clamp(.47+relief*.40+sediments*.12+craters,.23,.78);
        }else if(world.kind==="ice"){
          // Broad Neptune-like atmosphere: smooth blue gradients with just a
          // few wispy high clouds instead of repeated stripes.
          const mist=terrain(lon*2.4+3,lat*2.8+7,seed+117)-.5;
          const highCloud=terrain(lon*8+21,lat*5+11,seed+39)-.5;
          hue=world.hue+mist*10;
          sat=.50+mist*.13;
          lum=.51+mist*.15+highCloud*.055;
          const airy=smooth((highCloud-.15)*4.0);
          lum+=airy*.12;
          sat-=airy*.10;
        }else if(world.kind==="cloud"){
          // Venus-like pale reflective cloud deck, broad swirls instead of
          // highly repetitive garment-pattern bands.
          const cloud=terrain(lon*3.7+4,lat*3.4+3,seed)-.5;
          const wisps=terrain(lon*9,lat*7,seed+77)-.5;
          hue=world.hue+cloud*11;
          sat=.25+cloud*.08;
          lum=.67+cloud*.18+wisps*.035;
        }
        const illumination=clamp(.15+.83*Math.max(0,z*.85-u*.30-v*.36),.10,1);
        const limb=smooth((1-squared)*19);
        const [red,green,blue]=rgb((hue+360)%360,clamp(sat,.09,.8),clamp(lum,.11,.92));
        pixels[o]=Math.round(red*illumination);
        pixels[o+1]=Math.round(green*illumination);
        pixels[o+2]=Math.round(blue*illumination);
        pixels[o+3]=Math.round(255*limb);
      }
    }
    g.putImageData(data,0,0);
    textures.set(world.id,c);
    return c;
  }

  function drawSun(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){
    if(r<1){
      ctx.fillStyle="rgba(255,224,159,.69)";
      ctx.beginPath();ctx.arc(x,y,Math.max(.5,r),0,TAU);ctx.fill();
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation="screen";
    const corona=ctx.createRadialGradient(x,y,0,x,y,r*4.4);
    corona.addColorStop(0,"rgba(255,248,222,.78)");
    corona.addColorStop(.18,"rgba(255,206,120,.50)");
    corona.addColorStop(.35,"rgba(255,136,48,.13)");
    corona.addColorStop(.64,"rgba(255,107,40,.045)");
    corona.addColorStop(1,"rgba(238,90,18,0)");
    ctx.fillStyle=corona;
    ctx.beginPath();ctx.arc(x,y,r*4.4,0,TAU);ctx.fill();
    const photosphere=ctx.createRadialGradient(x-r*.26,y-r*.23,r*.04,x,y,r*1.02);
    photosphere.addColorStop(0,"#fffbe4");
    photosphere.addColorStop(.40,"#fff3ac");
    photosphere.addColorStop(.78,"#ffb34d");
    photosphere.addColorStop(1,"#b94320");
    ctx.fillStyle=photosphere;
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    ctx.save();
    ctx.beginPath();ctx.arc(x,y,r*.97,0,TAU);ctx.clip();
    for(let k=0;k<110;k++){
      const a=rnd(k*13+32)*TAU;
      const d=Math.sqrt(rnd(k*17+44))*r*.88;
      const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
      ctx.fillStyle=k%3===0?"rgba(255,244,166,.14)":"rgba(146,36,16,.14)";
      ctx.beginPath();ctx.arc(px,py,Math.max(.42,r*.045),0,TAU);ctx.fill();
    }
    ctx.restore();
    ctx.restore();
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
    // In a rear-facing window, the near planets slide into view from behind
    // the window frame, then shrink. They never jump or pause in the centre.
    if(r<.22||x+r*2<0||x-r*2>w||y+r*2<0||y-r*2>h)return;
    if(world.kind==="sun"){ drawSun(ctx,x,y,r);return; }
    if(r<1.6){
      ctx.fillStyle="hsla("+world.hue+",34%,84%,.48)";
      ctx.beginPath();ctx.arc(x,y,Math.max(.34,r),0,TAU);ctx.fill();
      return;
    }
    if(world.ring && r>3.7){
      ctx.strokeStyle="hsla("+world.hue+",25%,77%,.30)";
      ctx.lineWidth=Math.max(.9,r*.18);
      ctx.beginPath();ctx.ellipse(x,y,r*1.79,r*.37,-.22,Math.PI,TAU);ctx.stroke();
      ctx.strokeStyle="hsla("+world.hue+",27%,55%,.28)";
      ctx.lineWidth=Math.max(.5,r*.055);
      ctx.beginPath();ctx.ellipse(x,y,r*2.06,r*.42,-.22,Math.PI,TAU);ctx.stroke();
    }
    ctx.drawImage(texturedWorld(world),x-r,y-r,r*2,r*2);
    if(world.moon && r>6.0) {
      // A separate, cratered satellite: small, irregular, darker than its
      // parent and offset beside it, NOT just a second identical sphere.
      const mx=x+r*2.05, my=y-r*.69, mr=Math.max(1.2,r*.21);
      const moon=ctx.createRadialGradient(mx-mr*.28,my-mr*.32,mr*.02,mx,my,mr);
      moon.addColorStop(0,"#c4c5bb");
      moon.addColorStop(.57,"#7a807b");
      moon.addColorStop(1,"#2d3235");
      ctx.fillStyle=moon;
      ctx.beginPath();ctx.arc(mx,my,mr,0,TAU);ctx.fill();
      if(mr>2.4){
        ctx.fillStyle="rgba(37,42,48,.23)";
        for(let m=0;m<3;m++){
          ctx.beginPath();
          ctx.arc(mx+mr*(.26*m-.42),my+mr*(.24-(m%2)*.46),mr*.17,0,TAU);
          ctx.fill();
        }
      }
    }
    if(world.ring && r>3.7){
      ctx.strokeStyle="hsla("+world.hue+",33%,85%,.56)";
      ctx.lineWidth=Math.max(.85,r*.14);
      ctx.beginPath();ctx.ellipse(x,y,r*1.79,r*.37,-.22,0,Math.PI);ctx.stroke();
      ctx.strokeStyle="hsla("+world.hue+",34%,64%,.31)";
      ctx.lineWidth=Math.max(.5,r*.045);
      ctx.beginPath();ctx.ellipse(x,y,r*2.07,r*.42,-.22,0,Math.PI);ctx.stroke();
    }
  }

  function drawSky(ctx:CanvasRenderingContext2D,now:number,w:number,h:number,step:number) {
    // At the beginning there is no backdrop: just the title and first galaxy.
    // At tap 2, 3 and 5 there are precisely ~10, ~30 and ~100 faraway stars.
    // By the time the first galaxy is a distant point the WHOLE sky is alive.
    const count=visibleStarCount(step);
    if(count<=0)return;
    const g=galaxyGeometry(step,w,h);
    // When a galaxy first becomes readable the surrounding sky is quieter,
    // but never black. The little stars return in depth as it recedes.
    const outerWeight=1-.30*smooth((step-170)/29)
      +.29*smooth((step-211)/19);
    const tiny=step>=228;
    for(let i=0;i<Math.ceil(count);i++){
      const p=skyStars[i];
      // Only gentle rear-view parallax: this NEVER lerps stars into a
      // central cluster or a mathematically arranged pinwheel.
      const recede=1-(.04+.13*rnd(i*19+333))*
        smooth((step-5)/118);
      const drift=step<145 ? .013*Math.sin(step*.084+p.phase) : 0;
      const ux=.5+(p.x-.5)*recede+drift*(p.y-.5);
      const uy=.5+(p.y-.5)*recede-drift*(p.x-.5);
      const x=w*ux;
      const y=h*uy;
      const appearing=clamp(count-i,0,1);
      const sparkle=.73+.27*Math.sin(now*.00145+p.phase+step*.18);
      const alpha=Math.min(.95,p.power*outerWeight*appearing*sparkle);
      if(alpha<.007)continue;
      ctx.fillStyle="hsla("+p.hue+",43%,88%,"+alpha.toFixed(3)+")";
      ctx.beginPath();ctx.arc(x,y,p.radius,0,TAU);ctx.fill();
    }

    // Wider cosmic space: additional pinpoints appear at independent fixed
    // bearings once the FULL galaxy has been revealed, then sparkle gently
    // throughout the final thirty seconds.
    const deepWeight=smooth((step-205)/25);
    if(deepWeight>0.001){
      for(const p of deepStars){
        const pulse=.63+.37*Math.sin(now*.00145+p.phase+step*.035);
        const alpha=p.power*deepWeight*pulse;
        if(alpha<.01)continue;
        const x=p.x*w,y=p.y*h;
        ctx.fillStyle="hsla("+p.hue+",52%,90%,"+alpha.toFixed(3)+")";
        ctx.beginPath();ctx.arc(x,y,p.radius,0,TAU);ctx.fill();
      }
    }
    // A handful of bright stars twinkle softly in different colours.
    const bright=Math.floor(34*clamp((step-5)/15,0,1));
    for(let i=0;i<bright;i++){
      const p=skyBright[i];
      const x=w*p.x,y=h*p.y;
      const a=outerWeight*p.power*(.72+.28*Math.sin(now*.001+p.phase+step*.41));
      if(a<.008)continue;
      const radius=p.radius*5;
      const glow=ctx.createRadialGradient(x,y,0,x,y,radius);
      glow.addColorStop(0,"hsla("+p.hue+",65%,86%,"+(a*.23).toFixed(3)+")");
      glow.addColorStop(1,"hsla("+p.hue+",51%,62%,0)");
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();
      ctx.fillStyle="hsla("+p.hue+",39%,95%,"+a.toFixed(3)+")";
      ctx.beginPath();ctx.arc(x,y,p.radius,0,TAU);ctx.fill();
    }
    // Last view: a few different-coloured points brighten and fade in place.
    // The galaxy becomes only one of the distant lights while all the other
    // stars remain scattered. No moving star trails or flashing wallpaper.
    const finale=smooth((step-215)/17);
    if(finale>0.002){
      for(let i=0;i<24;i++){
        const p=skyBright[i];
        const shimmer=Math.pow(Math.max(0,Math.sin(now*.0016+p.phase+i*.13)),5);
        const intensity=finale*shimmer*(.23+.28*p.power);
        if(intensity<.014)continue;
        const x=w*p.x,y=h*p.y,radius=3.5+p.radius*5;
        const corona=ctx.createRadialGradient(x,y,0,x,y,radius);
        corona.addColorStop(0,"hsla("+p.hue+",76%,92%,"+intensity.toFixed(3)+")");
        corona.addColorStop(1,"hsla("+p.hue+",70%,72%,0)");
        ctx.fillStyle=corona;
        ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();
      }
    }
    // Short, sparse glints respond to each tap during the long flight through
    // the starfield. Their positions vary without scrambling the fixed sky;
    // the subtle apparent recession still comes from the parallax above.
    if(step>=18 && step<145){
      const whole=Math.floor(step),partial=step-whole;
      const pulse=Math.sin(Math.PI*partial);
      if(pulse>.03){
        for(let j=0;j<5;j++){
          const starIndex=Math.floor(rnd(whole*131+j*17+39)*skyStars.length);
          const p=skyStars[starIndex];
          const x=w*(.5+(p.x-.5)*(1-.08*smooth((step-5)/118)));
          const y=h*(.5+(p.y-.5)*(1-.08*smooth((step-5)/118)));
          const glow=ctx.createRadialGradient(x,y,0,x,y,5+p.radius*4);
          glow.addColorStop(0,"hsla("+p.hue+",55%,91%,"+(pulse*.31).toFixed(3)+")");
          glow.addColorStop(1,"hsla("+p.hue+",55%,72%,0)");
          ctx.fillStyle=glow;
          ctx.beginPath();ctx.arc(x,y,5+p.radius*4,0,TAU);ctx.fill();
        }
      }
    }
    if(tiny){
      ctx.fillStyle="rgba(222,218,249,.82)";
      ctx.beginPath();ctx.arc(g.x,g.y,.72,0,TAU);ctx.fill();
    }
  }

  function drawDistantGalaxy(ctx:CanvasRenderingContext2D,step:number,w:number,h:number) {
    const g=galaxyGeometry(step,w,h);
    // The nebula is only diffuse dust around the 650 EXISTING sky stars.
    // It is not a newly appearing photograph or a separate ring of dots.
    // First the stars become denser, then only the tip of a spiral arm is
    // suggested. A recognisable full disk comes much later, with no planets.
    // At first we are too close to discern spiral arms: the same diffuse
    // region fills the window. A slow pullback reveals the whole disc as a
    // consequence of perspective, NEVER of loose stars flying inward.
    const hazeStrength=.065*smooth((step-173)/13)
      +.67*smooth((step-186)/19);
    if(hazeStrength<.001 || g.r<2)return;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    ctx.globalAlpha=hazeStrength;
    const texture=ensureNebula();
    ctx.drawImage(texture,g.x-g.r,g.y-g.r,g.r*2,g.r*2);
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
