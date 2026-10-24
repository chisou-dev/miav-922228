/**
 * MIAV galaxy flight, cinematic perspective simulation.
 *
 * Objects are fixed in world space; ONLY the virtual camera advances when
 * clicked. Screen positions and apparent radii come from perspective.
 * The planets are fictional art, and the distant Milky Way view is an
 * artistic logarithmic-scale transition, not a measured astrophysical route.
 */
type BodyKind = "jovian" | "storm" | "ice" | "rock" | "cloud";
type Body = {
  x: number; y: number; z: number; radius: number; hue: number;
  kind: BodyKind; seed: number; ring?: boolean; moon?: boolean;
};
type Spark = { x: number; y: number; z: number; hue: number; strength: number; size: number; phase: number };
const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (v: number) => { const u=clamp(v,0,1); return u*u*(3-2*u); };
const lerp = (a: number,b: number,t: number) => a+(b-a)*t;
function hash(n: number) {
  let v = Math.imul(n + 1, 0x9e3779b1) >>> 0;
  v = Math.imul(v ^ (v >>> 16), 0x85ebca6b) >>> 0;
  v = Math.imul(v ^ (v >>> 13), 0xc2b2ae35) >>> 0;
  return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
}
function color(h: number, sat: number, lum: number) {
  const a = sat * Math.min(lum,1-lum);
  const f = (n: number) => {
    const k=(n+h/30)%12;
    return Math.round((lum-a*Math.max(-1,Math.min(k-3,9-k,1)))*255);
  };
  return [f(0),f(8),f(4)] as const;
}

export function createGalaxyFlightScene() {
  // One coherent itinerary: each body is pinned to a 3D world coordinate.
  // Bodies are NOT prearranged in a ring or an eleven-planet UI layout.
  // Camera advances on the positive Z axis, never reversing.
  const bodies: Body[] = [
    { x:-28,y:6,z:152,radius:7.8,hue:195,kind:"ice",seed:1 },
    { x:31,y:-14,z:255,radius:14,hue:30,kind:"jovian",seed:2,ring:true },
    { x:38,y:-8,z:265,radius:3.0,hue:205,kind:"rock",seed:3,moon:true },
    { x:-17,y:-21,z:352,radius:8.5,hue:16,kind:"storm",seed:4 },
    { x:26,y:20,z:468,radius:10.5,hue:219,kind:"ice",seed:5 },
    { x:-36,y:10,z:559,radius:5.3,hue:29,kind:"rock",seed:6 },
    { x:30,y:-26,z:663,radius:12,hue:38,kind:"jovian",seed:7 },
    { x:44,y:-29,z:676,radius:2.7,hue:190,kind:"rock",seed:8,moon:true },
    { x:-30,y:-17,z:768,radius:8.4,hue:250,kind:"storm",seed:9,ring:true },
    { x:20,y:24,z:883,radius:9.1,hue:173,kind:"cloud",seed:10 },
    { x:-40,y:18,z:962,radius:6.4,hue:15,kind:"rock",seed:11 },
    { x:30,y:-6,z:1072,radius:12.8,hue:25,kind:"jovian",seed:12 },
    { x:-26,y:-24,z:1142,radius:6.0,hue:192,kind:"ice",seed:13 },
  ];
  const distant: Spark[] = Array.from({length:2250},(_,i)=>({
    x:(hash(i*11+17)-0.5)*2400,
    y:(hash(i*13+211)-0.5)*1500,
    z:180+hash(i*19+617)*18000,
    hue:[200,208,215,236,37,33,2,271][i%8],
    strength:0.22+hash(i*31+19)*0.65,
    size:0.37+hash(i*17+31)*0.9,
    phase:hash(i*73+9)*TAU,
  }));
  // A nonrotating, preseeded four-armed Milky-Way-like stellar disk.
  // These are STARS, not the small planets collected into an orbit.
  const galaxy: (Spark & { u:number;v:number })[] = Array.from({length:2400},(_,i)=>{
    const r=Math.sqrt((i+0.5)/2400);
    const a=(i%4)*TAU/4+r*6.4+(hash(i*97+17)-0.5)*(0.18+0.4*r);
    return {
      x:0,y:0,z:0,hue:[216,205,230,265,322,39][i%6],
      strength:0.15+hash(i*31+7)*0.84,
      size:0.42+hash(i*17+41)*1.03,
      phase:hash(i*53+13)*TAU,
      u:r*Math.cos(a)+(hash(i*23+251)-0.5)*0.04,
      v:r*Math.sin(a)*0.64+(hash(i*29+151)-0.5)*0.028,
    };
  });
  const textures = new Map<string,HTMLCanvasElement>();

  function texture(body: Body) {
    const key=body.kind+"-"+body.hue+"-"+body.seed;
    const saved=textures.get(key);
    if(saved)return saved;
    const side=320;
    const canvas=document.createElement("canvas");
    canvas.width=canvas.height=side;
    const g=canvas.getContext("2d");
    if(!g)return canvas;
    const data=g.createImageData(side,side);
    const pix=data.data;
    const spotX=-0.12+0.04*Math.sin(body.seed),spotY=0.30;
    for(let j=0;j<side;j++){
      const ny=(j-side/2)/(side*0.49);
      for(let i=0;i<side;i++){
        const nx=(i-side/2)/(side*0.49);
        const rr=nx*nx+ny*ny;
        const index=(j*side+i)*4;
        if(rr>=1){pix[index+3]=0;continue;}
        const depth=Math.sqrt(1-rr);
        const latitude=Math.asin(ny);
        const longitude=Math.atan2(nx,Math.max(0.07,depth));
        const turbulence=
          0.52*Math.sin(longitude*8+body.seed*1.9+ny*11)+
          0.27*Math.sin(longitude*19+ny*28+body.seed*2.3)+
          0.14*Math.cos(longitude*37-ny*52);
        const wavy=latitude+0.050*Math.sin(longitude*5+ny*14+body.seed)+
          0.017*turbulence;
        const belts=Math.sin(wavy*29+0.6*Math.sin(longitude*8))+0.45*Math.sin(wavy*67+longitude*4);
        let hue=body.hue, sat=0.40, lum=0.51;
        if(body.kind==="jovian"||body.kind==="storm"){
          // Multi-scale atmospheric belts, nonparallel eddies and one
          // elliptical Great-Red-Spot-like cyclone on storm giants.
          hue=body.hue+9*Math.sin(wavy*17)+11*Math.sin(wavy*48+longitude*4);
          sat=clamp(0.31+0.11*belts+0.06*turbulence,0.18,0.66);
          lum=clamp(0.58+0.16*belts+0.07*turbulence,0.24,0.84);
          const dx=(nx-spotX)*1.1,dy=ny-spotY;
          const spiral= Math.atan2(dy,dx)+3.1*Math.hypot(dx,dy);
          const patch=(dx*dx/(0.29*0.29)+dy*dy/(0.15*0.15));
          if(body.kind==="jovian"&&patch<1.2){
            const inward=1-smooth(patch/1.2);
            const stormBand=Math.cos(spiral*2.8)*0.07;
            hue=lerp(hue,13+stormBand*26,inward*0.8);
            sat+=0.21*inward;
            lum=lerp(lum,0.53+stormBand,inward*0.65);
          }
        }else if(body.kind==="ice"||body.kind==="cloud"){
          hue=body.hue+8*turbulence;
          sat=0.42+0.12*Math.sin(wavy*35+longitude*4);
          lum=0.55+0.11*Math.sin(wavy*43+3*Math.sin(longitude*3));
        }else{
          // Cratered rocky world: longitude noise, basin depressions and
          // high-frequency albedo differences instead of a striped sphere.
          const land=Math.sin(longitude*19+body.seed)*Math.cos(latitude*27)+
            0.55*Math.sin(longitude*49+latitude*31);
          const impact=(Math.sin(longitude*24+latitude*17)*Math.cos(longitude*12-latitude*38));
          hue=body.hue+7*land;
          sat=0.19+0.10*land;
          lum=0.44+0.15*land+0.07*impact;
        }
        const light=clamp(0.23+0.77*Math.max(0,nx*-0.44+ny*-0.31+depth*0.82),0.16,1);
        const edge=clamp((1-rr)*8,0,1);
        const [red,green,blue]=color(((hue%360)+360)%360,clamp(sat,0.09,0.79),clamp(lum,0.12,0.88));
        pix[index]=Math.round(red*light);
        pix[index+1]=Math.round(green*light);
        pix[index+2]=Math.round(blue*light);
        pix[index+3]=Math.round(255*edge);
      }
    }
    g.putImageData(data,0,0);
    textures.set(key,canvas);
    return canvas;
  }

  function shipPosition(t: number) {
    // Every tap changes the same monotonically increasing camera location.
    // Ahead-of-camera objects expand and slide sideways as their depth falls.
    const z=Math.max(0,t-31)*9.75;
    return {x:0,y:0,z};
  }

  function stars(ctx:CanvasRenderingContext2D,t:number,now:number,w:number,h:number){
    const camera=shipPosition(t);
    const focal=Math.min(w,h)*0.82;
    for(const star of distant){
      const dz=star.z-camera.z;
      if(dz<=2)continue;
      const x=w*.5+focal*(star.x-camera.x)/dz;
      const y=h*.5+focal*(star.y-camera.y)/dz;
      if(x<-2||y<-2||x>w+2||y>h+2)continue;
      const shimmer=0.84+0.16*Math.sin(now*0.00064+star.phase);
      const a=star.strength*shimmer;
      ctx.fillStyle="hsla("+star.hue+",42%,85%,"+a.toFixed(3)+")";
      ctx.beginPath();
      ctx.arc(x,y,star.size,0,TAU);
      ctx.fill();
    }
  }

  function drawBody(ctx:CanvasRenderingContext2D,body:Body,camera:{x:number;y:number;z:number},w:number,h:number) {
    const dz=body.z-camera.z;
    if(dz<=1.7) return;
    const focal=Math.min(w,h)*0.82;
    const x=w/2+(body.x-camera.x)*focal/dz;
    const y=h/2+(body.y-camera.y)*focal/dz;
    const r=body.radius*focal/dz;
    if(x+r*1.9<0||x-r*1.9>w||y+r*1.9<0||y-r*1.9>h)return;
    if(r<1.7) {
      const a=clamp(r/1.7,0.1,0.8);
      ctx.fillStyle="hsla("+body.hue+",52%,85%,"+a.toFixed(3)+")";
      ctx.beginPath();ctx.arc(x,y,Math.max(0.4,r),0,TAU);ctx.fill();
      return;
    }
    const halo=ctx.createRadialGradient(x,y,r*.4,x,y,r*1.24);
    halo.addColorStop(0,"hsla("+body.hue+",64%,72%,0.0)");
    halo.addColorStop(.82,"hsla("+body.hue+",63%,53%,0.0)");
    halo.addColorStop(1,"hsla("+body.hue+",50%,49%,0)");
    ctx.fillStyle=halo;
    ctx.fillRect(x-r*1.3,y-r*1.3,r*2.6,r*2.6);
    // Ring rear arc goes behind the spherical body and the front arc
    // over its lower limb. No plasma and no cartoon orbit strokes.
    if(body.ring&&r>3){
      ctx.strokeStyle="hsla("+body.hue+",40%,76%,0.46)";
      ctx.lineWidth=Math.max(0.75,r*.09);
      ctx.beginPath();ctx.ellipse(x,y,r*1.75,r*.35,-0.19,Math.PI,TAU);ctx.stroke();
    }
    ctx.drawImage(texture(body),x-r,y-r,r*2,r*2);
    if(body.ring&&r>3){
      ctx.strokeStyle="hsla("+body.hue+",38%,81%,0.55)";
      ctx.lineWidth=Math.max(.8,r*.10);
      ctx.beginPath();ctx.ellipse(x,y,r*1.75,r*.35,-0.19,0,Math.PI);ctx.stroke();
    }
  }

  function externalGalaxy(ctx:CanvasRenderingContext2D,t:number,now:number,w:number,h:number){
    if(t<100)return;
    // Stars in the window transition to a wider *external* view of the
    // galactic disk. Planets never line up or become the spiral's arms.
    const reveal=smooth((t-100)/25);
    const zoom=Math.pow(0.82,Math.max(0,t-128));
    const fullRadius=Math.min(w,h)*0.48*zoom;
    const gx=w*0.59,gy=h*.48;
    if(reveal<0.001)return;
    ctx.save();
    ctx.globalCompositeOperation="screen";
    const core=ctx.createRadialGradient(gx,gy,0,gx,gy,Math.max(1,fullRadius*.42));
    core.addColorStop(0,"rgba(245,226,255,"+(0.32*reveal)+")");
    core.addColorStop(.32,"rgba(164,139,218,"+(0.16*reveal)+")");
    core.addColorStop(1,"rgba(61,83,152,0)");
    ctx.fillStyle=core;
    ctx.beginPath();ctx.arc(gx,gy,Math.max(1,fullRadius*.42),0,TAU);ctx.fill();
    for(const p of galaxy){
      const x=gx+p.u*fullRadius,y=gy+p.v*fullRadius;
      if(x<-2||y<-2||x>w+2||y>h+2)continue;
      const glitter=.89+.11*Math.sin(now*.0004+p.phase);
      ctx.fillStyle="hsla("+p.hue+",48%,83%,"+(p.strength*reveal*glitter).toFixed(3)+")";
      ctx.beginPath();
      ctx.arc(x,y,Math.max(.26,p.size*(.84-.15*reveal)),0,TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    draw(ctx:CanvasRenderingContext2D,step:number,now:number,w:number,h:number){
      const camera=shipPosition(step);
      stars(ctx,step,now,w,h);
      // The 3D world is sorted by depth; far worlds are behind near ones.
      for(let i=bodies.length-1;i>=0;i--)drawBody(ctx,bodies[i],camera,w,h);
      externalGalaxy(ctx,step,now,w,h);
    }
  };
}
