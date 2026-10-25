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
function limpHue(from:number,to:number,t:number){
  return from+(to-from)*clamp(t,0,1);
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
  {id:1,peek:32,depth:106,radius:29,side:"right",transverse:.34,kind:"storm",hue:204},
  {id:2,peek:44,depth:185,radius:13,side:"left",transverse:.78,kind:"ice",hue:209},
  {id:3,peek:54,depth:235,radius:28,side:"top",transverse:.66,kind:"vortex",hue:214},
  {id:4,peek:65,depth:285,radius:22,side:"right",transverse:.68,kind:"jovian",hue:34,ring:true,moon:true},
  {id:5,peek:67,depth:290,radius:5,side:"right",transverse:.49,kind:"rock",hue:212,moon:true},
  {id:6,peek:74,depth:337,radius:10,side:"bottom",transverse:.23,kind:"rock",hue:17},
  {id:7,peek:82,depth:399,radius:18,side:"left",transverse:.31,kind:"cloud",hue:45,moon:true},
  {id:8,peek:89,depth:447,radius:8,side:"top",transverse:.24,kind:"sun",hue:36},
  {id:9,peek:97,depth:509,radius:20,side:"bottom",transverse:.84,kind:"rock",hue:42},
];

export function createGalaxyFlightScene() {
  const textures = new Map<number, HTMLCanvasElement>();
  // The distant stars never migrate toward the screen centre. Their fixed
  // bearings persist for the whole trip; the viewer simply pulls farther
  // away from a pre-existing, much larger star system.
  const SKY_STARS=1370;
  // The voyage begins with ONLY the MIAV lettering and one galaxy.
  // Its retreat reveals a few distant stars at a time. The entire sky is
  // populated BEFORE the first nearby planet can slide into the frame.
  // After the planets become pinpoints, the same vast stellar background
  // steadily thins as the far galaxy resolves. No abrupt scene changes.
  const countStops: readonly [number, number][] = [
    [0,0],[3,0],[5,9],[8,35],[12,108],[16,255],
    [20,470],[25,895],[31,SKY_STARS],[138,SKY_STARS],
    [153,1300],[167,1050],[181,710],[195,340],
    [208,155],[218,95],[235,95]
  ];
  function visibleStarCount(step:number){
    for(let k=1;k<countStops.length;k++){
      const [end,total]=countStops[k];
      if(step<=end){
        const [start,previous]=countStops[k-1];
        const t=smooth((step-start)/(end-start));
        return previous+(total-previous)*t;
      }
    }
    return 95;
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
  let nebulaCache:HTMLCanvasElement|null=null;

  function galaxyGeometry(step:number,w:number,h:number){
    const short=Math.min(w,h);
    // Continuous wide-angle recession: the existing star system is initially
    // far wider than our field of view. As the camera retreats its dust lanes
    // and edges naturally become visible. No sudden spawn or centripetal
    // motion of existing stars.
    // Logarithmic camera zoom over MANY taps, rather than a steep smoothstep
    // that made the full galaxy suddenly snap into view near the end.
    const framing=clamp((step-125)/94,0,1);
    const recession=Math.max(0,step-219);
    const r=short*.245*Math.exp((1-framing)*3.45)*Math.exp(-.285*recession);
    // At first we are looking through an outer arm, not down the exact
    // middle of the nucleus. The camera gently widens and recentres during
    // retreat, so first one arm, then the other, then the galactic body fit.
    const outerView=1-smooth((step-138)/70);
    return {
      x:w*(.51+.31*outerView),
      y:h*(.49-.12*outerView),
      r
    };
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
    haze.addColorStop(0,"rgba(223,215,237,.26)");
    haze.addColorStop(.12,"rgba(159,176,221,.18)");
    haze.addColorStop(.35,"rgba(88,123,187,.12)");
    haze.addColorStop(.80,"rgba(43,92,155,.035)");
    haze.addColorStop(1,"rgba(27,50,96,0)");
    g.fillStyle=haze;
    g.beginPath();g.arc(0,0,n*.47,0,TAU);g.fill();
    g.restore();

    // Wide translucent interstellar gas wisps have their own scale and hue.
    // They are baked into the SAME fixed galaxy as the star points, so they
    // gradually come into view during zoom-out instead of fading in as a
    // separate stage picture.
    g.save();
    g.globalCompositeOperation="screen";
    for(let i=0;i<240;i++){
      const radial=.10+rnd(i*43+117)*.79;
      const arm=i%4;
      const theta=arm*TAU/4+radial*4.75
        +(rnd(i*79+19)-.5)*(.48+.30*radial);
      const x=middle+Math.cos(theta)*radial*n*.42;
      const y=middle+Math.sin(theta)*radial*n*.275;
      const radius=29+rnd(i*37+101)*81;
      const q=g.createRadialGradient(x,y,0,x,y,radius);
      if(i%7<3){
        q.addColorStop(0,"rgba(86,152,231,.048)");
        q.addColorStop(.42,"rgba(83,142,214,.018)");
        q.addColorStop(1,"rgba(55,112,191,0)");
      }else if(i%7<5){
        q.addColorStop(0,"rgba(235,154,202,.038)");
        q.addColorStop(.40,"rgba(214,130,177,.014)");
        q.addColorStop(1,"rgba(194,107,159,0)");
      }else{
        q.addColorStop(0,"rgba(211,222,247,.034)");
        q.addColorStop(.44,"rgba(179,205,242,.012)");
        q.addColorStop(1,"rgba(135,157,208,0)");
      }
      g.fillStyle=q;
      g.beginPath();g.arc(x,y,radius,0,TAU);g.fill();
    }
    g.restore();

    // Deliberately broken spiral: asymmetric branches, dust lanes and an
    // uneven light envelope prevent a white dotted pinwheel appearance.
    for(let i=0;i<1950;i++){
      const radial=Math.sqrt(rnd(i*37+191))*.92;
      const arm=i%4;
      const theta=arm*TAU/4+radial*4.75+
        (rnd(i*71+51)-.5)*(.42+.45*radial);
      const cx=middle+Math.cos(theta)*radial*n*.42;
      const cy=middle+Math.sin(theta)*radial*n*.27;
      const rad=8+rnd(i*17+109)*31;
      const q=g.createRadialGradient(cx,cy,0,cx,cy,rad);
      const blue=i%9<6;
      q.addColorStop(0,blue?"rgba(128,170,231,.10)":"rgba(231,171,202,.083)");
      q.addColorStop(1,"rgba(85,110,160,0)");
      g.fillStyle=q;
      g.beginPath();g.arc(cx,cy,rad,0,TAU);g.fill();
    }
    // Stars are much less orderly than the old four perfect spiral tracks:
    // 40% are in the diffuse elliptical disc, the rest clustered along the
    // irregular arms. A radial limit softly blends away the last pixels.
    for(let i=0;i<26500;i++){
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
        if(world.kind==="jovian"){
          // Jupiter-inspired suspended clouds: the pale equatorial zone,
          // darker disrupted belts and just one large elongated storm.
          // Longitude-dependent warping prevents a tiled wallpaper effect.
          const turbulence=terrain(lon*2.6+1.9,lat*3.4-1.6,seed+47)-.5;
          const filament=terrain(lon*8.1-4.1,lat*17.3+5.6,seed+91)-.5;
          const wlat=lat+.13*turbulence+.045*Math.sin(lon*2.2+lat*3.1);
          const belts=Math.sin(wlat*15.6+filament*1.7)
            +.28*Math.sin(wlat*34.8+turbulence*1.9);
          hue=world.hue+belts*5.8+turbulence*12;
          sat=clamp(.29+belts*.065+filament*.07,.16,.51);
          lum=clamp(.64+belts*.135+filament*.07,.34,.89);
          const sx=u+.23,sy=v-.24;
          const eye=(sx*sx)/(.27*.27)+(sy*sy)/(.14*.14);
          const halo=smooth((2.2-eye)/1.65);
          const curling=Math.sin(Math.atan2(sy/.14,sx/.27)*2
            +Math.sqrt(Math.max(eye,0))*4.7);
          hue=limpHue(hue,18,halo*.76);
          sat+=halo*.15;
          lum=lum*(1-halo*.57)+(.45+.08*curling)*halo*.57;
        }else if(world.kind==="storm"){
          // An asymmetric blue-grey atmosphere with broad dark eddies and
          // intermittent white cloud tops, NOT another brown Jupiter.
          const t1=terrain(lon*2.8+4.1,lat*3.2-5.7,seed+65);
          const t2=terrain(lon*7.3+1.9,lat*7.8+4.2,seed+19);
          const atmosphere=Math.sin(lat*9.4+(t1-.5)*3.3
            +.35*Math.sin(lon*2.4))*.25;
          const cloud=smooth((t2+.28*t1-.46)*2.8);
          hue=world.hue+(t1-.5)*18+atmosphere*11;
          sat=.47+(t1-.5)*.13-cloud*.08;
          lum=.43+atmosphere*.23+(t2-.5)*.19+cloud*.20;
        }else if(world.kind==="vortex"){
          // Two overlapping BLUE and CRIMSON storm systems built from
          // domain-warped turbulence. Avoid radial repeating sine stripes
          // that made the previous planet resemble a painted bowling ball.
          const dx=u+.19,dy=v+.13;
          const dist=Math.hypot(dx,dy);
          const rotation=-2.05*Math.exp(-2.8*dist*dist);
          const c1=Math.cos(rotation),s1=Math.sin(rotation);
          let xu=dx*c1-dy*s1-.19;
          let yv=dx*s1+dy*c1-.13;
          const dx2=xu-.34,dy2=yv+.29;
          const rot2=1.25*Math.exp(-4.5*(dx2*dx2+dy2*dy2));
          const c2=Math.cos(rot2),s2=Math.sin(rot2);
          const xw=(dx2*c2-dy2*s2)+.34;
          const yw=(dx2*s2+dy2*c2)-.29;
          const low=terrain(xw*3.4+3.3,yw*3.9-1.1,seed+149);
          const mid=terrain(xw*8.1-4.3,yw*8.9+2.6,seed+99);
          const detail=terrain(xw*18.4+1.1,yw*19.9-3.7,seed+61);
          const redBand=clamp(.33+.52*(low-.5)
            +.36*Math.sin((xw-yw*.7)*3.1)
            +.34*(mid-.5),.02,.95);
          const redMix=smooth((redBand-.19)/.57);
          const streak=smooth((detail+.24*mid-.43)*2.3);
          const blue=rgb(214+low*7,.49+streak*.17,.35+.19*mid+.10*streak);
          const red=rgb(351+mid*9,.58+streak*.12,.32+.20*low+.09*streak);
          const pale=rgb(211,.30,.77);
          const cloudiness=streak*.27;
          const illumination=clamp(.14+.89*Math.max(0,z*.82-u*.30-v*.28),.07,1);
          const limb=smooth((1-squared)*19);
          for(let channel=0;channel<3;channel++){
            const base=blue[channel]*(1-redMix)+red[channel]*redMix;
            pixels[o+channel]=Math.round((base*(1-cloudiness)
              +pale[channel]*cloudiness)*illumination);
          }
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
    // Stars stay in their own positions at all distances. The old parallax
    // formula moved every point inward and gave the impression that somebody
    // was manufacturing a galaxy by collecting them at the centre.
    const outerWeight=1-.08*smooth((step-150)/58);
    const tiny=step>=230;
    for(let i=0;i<Math.ceil(count);i++){
      const p=skyStars[i];
      const x=w*p.x;
      const y=h*p.y;
      const appearing=clamp(count-i,0,1);
      const sparkle=.73+.27*Math.sin(now*.00145+p.phase+step*.18);
      const alpha=Math.min(.95,p.power*outerWeight*appearing*sparkle);
      if(alpha<.007)continue;
      ctx.fillStyle="hsla("+p.hue+",43%,88%,"+alpha.toFixed(3)+")";
      ctx.beginPath();ctx.arc(x,y,p.radius,0,TAU);ctx.fill();
    }

    // Keep a sparse handful of distant lights even at galaxy scale,
    // rather than switching to an empty black screen or respawning a new sky.
    // A handful of bright stars twinkle softly in different colours.
    const bright=Math.floor(34*smooth((step-9)/23)*
      (1-.67*smooth((step-153)/58)));
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
    // The ending stays restrained: the now-distant galaxy is one tiny
    // point within a naturally sparse intergalactic sky.
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
          const x=w*p.x;
          const y=h*p.y;
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
    // A single, large galactic star population is already present while
    // nearby planets are tiny. Its very faint outer haze becomes perceptible
    // gradually during a long recession. The low-opacity wide field comes
    // first; denser spiral features are only resolvable much later.
    // There is NO second overlay that suddenly appears on a fixed screen.
    // One gradually resolving galaxy: begin with barely visible dusty star
    // concentrations, let the outer filaments become legible, and reveal the
    // complete spiral only after a long retreat. The source never swaps.
    // The galactic texture does not appear during the planet flybys.
    // It is the fixed distant population underneath the same stars that
    // gets resolved slowly as the view recedes. Begin as very faint haze,
    // then let the existing population acquire a recognisable spiral shape.
    const wisps=smooth((step-138)/29);
    const resolved=smooth((step-159)/56);
    const hazeStrength=.026*wisps+.93*resolved;
    if(hazeStrength<.0003 || g.r<1.15)return;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    ctx.globalAlpha=hazeStrength;
    const texture=ensureNebula();
    // At early stages this galaxy is many screens wide. Crop its source to
    // the visible camera window instead of rasterising a huge offscreen image
    // each frame; it also gives perfectly smooth continuity while zooming.
    const side=g.r*2;
    const left=g.x-g.r,top=g.y-g.r;
    const x0=Math.max(0,left),y0=Math.max(0,top);
    const x1=Math.min(w,left+side),y1=Math.min(h,top+side);
    if(x1>x0 && y1>y0){
      const sx=(x0-left)/side*texture.width;
      const sy=(y0-top)/side*texture.height;
      const sw=(x1-x0)/side*texture.width;
      const sh=(y1-y0)/side*texture.height;
      ctx.drawImage(texture,sx,sy,sw,sh,x0,y0,x1-x0,y1-y0);
    }
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
