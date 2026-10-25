/**
 * Final MIAV voyage: a distant galaxy becomes one member of a much larger
 * cosmological collection, finally seen through a slowly drifting glass orb.
 * Everything is drawn on Canvas at runtime, with no pre-rendered finale image.
 * This is artistic scale, not a physical simulation of the observable universe.
 */
type GalaxyPoint = {
  x: number; y: number; z: number; size: number; phase: number;
  variant: number; opacity: number;
};
const TAU = Math.PI * 2;
const clamp = (v:number,a:number,b:number) => Math.max(a,Math.min(b,v));
const smooth = (v:number) => { const t=clamp(v,0,1); return t*t*(3-2*t); };
const lerp = (a:number,b:number,t:number) => a+(b-a)*t;
function random(seed:number) {
  let x=Math.imul(seed+31,0x9e3779b1)>>>0;
  x=Math.imul(x^(x>>>16),0x85ebca6b)>>>0;
  x=Math.imul(x^(x>>>13),0xc2b2ae35)>>>0;
  return ((x^(x>>>16))>>>0)/4294967295;
}
function galaxySprite(variant:number):HTMLCanvasElement {
  const c=document.createElement("canvas");
  c.width=c.height=128;
  const g=c.getContext("2d",{alpha:true});
  if(!g)return c;
  const schemes=[
    [214,233,255], [255,221,184], [228,208,245],
    [202,237,235], [244,212,203], [205,218,249],
  ];
  const rgb=schemes[variant%schemes.length];
  const center=64;
  const glow=g.createRadialGradient(center,center,0,center,center,61);
  glow.addColorStop(0,"rgba("+rgb.join(",")+",.66)");
  glow.addColorStop(.12,"rgba("+rgb.join(",")+",.30)");
  glow.addColorStop(.48,"rgba("+rgb.join(",")+",.075)");
  glow.addColorStop(1,"rgba("+rgb.join(",")+",0)");
  g.fillStyle=glow;g.fillRect(0,0,128,128);
  const elliptical=variant===1||variant===2||variant===5;
  const irregular=variant===3||variant===4;
  // Only one of the six families is a resolved spiral; most are smooth
  // lenticulars, irregular star-forming systems or asymmetric galaxies.
  const arms=variant===0?2:0;
  for(let i=0;i<1030;i++){
    const rad=Math.sqrt(random(i*13+variant*397+9));
    let theta=TAU*random(i*41+variant*29+11);
    const arm=i%arms;
    if(arms){
      theta=TAU*arm/arms+rad*5.2+(random(i*27+variant*37)-.5)*(.85+.3*rad);
    }
    const axial=elliptical?.28:irregular?.72:.54;
    const distance=rad*(8+48*random(i*17+variant*97));
    const lopsided=irregular?Math.sin(theta*2.4+variant)*8:0;
    const x=center+Math.cos(theta)*(distance+lopsided);
    const y=center+Math.sin(theta)*(distance-lopsided*.3)*axial;
    const luminosity=Math.pow(1-rad,.42);
    const alpha=(.18+.78*luminosity)*(.42+.58*random(i*53+17));
    const r=.28+random(i*7+variant*33)*(.43+luminosity*1.1);
    g.fillStyle="rgba("+rgb.join(",")+","+alpha.toFixed(3)+")";
    g.fillRect(x,y,r,r);
  }
  const nucleus=g.createRadialGradient(center,center,0,center,center,elliptical?20:13);
  nucleus.addColorStop(0,"rgba(255,252,244,1)");
  nucleus.addColorStop(.18,"rgba(255,238,212,.90)");
  nucleus.addColorStop(.51,"rgba("+rgb.join(",")+",.54)");
  nucleus.addColorStop(1,"rgba("+rgb.join(",")+",0)");
  g.fillStyle=nucleus;
  g.beginPath();g.arc(center,center,elliptical?20:13,0,TAU);g.fill();
  return c;
}
function makePoints():GalaxyPoint[] {
  const knots=Array.from({length:15},(_,i)=>({
    x:(random(i*37+201)-.5)*1.6,
    y:(random(i*31+331)-.5)*1.5,
    z:(random(i*53+431)-.5)*1.5,
  }));
  // Irregular clustered filaments: not a grid of planets or a regular spiral.
  return Array.from({length:196},(_,i)=>{
    const anchor=knots[Math.floor(random(i*17+14)*knots.length)];
    const other=knots[Math.floor(random(i*19+103)*knots.length)];
    const t=random(i*47+87);
    const spread=i%4===0?.14:.065;
    let x=lerp(anchor.x,other.x,t)+(random(i*59+121)-.5)*spread*2;
    let y=lerp(anchor.y,other.y,t)+(random(i*61+231)-.5)*spread*2;
    let z=lerp(anchor.z,other.z,t)+(random(i*67+311)-.5)*spread*2;
    const d=Math.hypot(x,y,z);
    if(d>.91){ x*=.91/d;y*=.91/d;z*=.91/d; }
    return {
      x,y,z,
      size:.42+Math.pow(random(i*71+19),2)*2.35,
      phase:random(i*73+31)*TAU,
      variant:Math.floor(random(i*79+91)*6),
      opacity:.53+random(i*83+19)*.47,
    };
  });
}
export function createGalaxyClusterOrb() {
  const points=makePoints();
  // Lazy texture construction: no work or remote image transfer until needed.
  let sprites:HTMLCanvasElement[]|null=null;
  function ensureSprites(){
    if(!sprites)sprites=Array.from({length:6},(_,i)=>galaxySprite(i));
    return sprites;
  }
  function draw(
    ctx:CanvasRenderingContext2D,w:number,h:number,step:number,
    now:number,finalElapsed:number|null,
  ){
    // Start alongside the off-axis star cloud, not with a different giant
    // spiral appearing in the centre. Each tap opens more of the same region.
    const reveal=smooth((step-121)/45);
    if(reveal<=.001)return;
    const short=Math.min(w,h);
    // Slightly larger than the first approved orb; always fit on a phone.
    const r=short*.405;
    const sphereVisibility=smooth((reveal-.62)/.35);
    const zoom=Math.exp(Math.log(5.0)*(1-reveal));
    const held=Math.max(0,finalElapsed??0);
    const drift=sphereVisibility*smooth(held/1900);
    const settle=smooth((reveal-.13)/.87);
    const centreX=lerp(w*.79,w*.51,settle);
    const centreY=lerp(h*.275,h*.515,settle);
    const wanderX=Math.min(w*.11,60)*
      (.55*Math.sin(held*.00019)+.29*Math.sin(held*.000083+1.7)
       +.16*Math.sin(held*.000047+.6));
    const wanderY=Math.min(h*.17,95)*
      (.49*Math.sin(held*.000137+.4)+.33*Math.sin(held*.000061+2)
       +.18*Math.sin(held*.000031+.9));
    const cx=lerp(centreX,clamp(centreX+drift*wanderX,r+8,w-r-8),drift);
    const cy=lerp(centreY,clamp(centreY+drift*wanderY,r+12,h-r-12),drift);
    const alpha=smooth((reveal-.015)/.54);
    // Rotation and drift continue for the entire three-minute hold, with no
    // single-loop path or automatic advancement to another scene.
    const yaw=held*.000037+Math.sin(held*.000059)*.22;
    const pitch=held*.000029+Math.sin(held*.000041+1.4)*.18;
    const textures=ensureSprites();
    ctx.save();
    // Barely visible gas lanes behind the materialised galaxies. The falloff
    // never has a rectangular edge and does not black out the existing sky.
    if(sphereVisibility>.015){
      const halo=ctx.createRadialGradient(cx-r*.22,cy-r*.3,r*.05,cx,cy,r*1.11);
      halo.addColorStop(0,"rgba(49,65,114,"+(.13*sphereVisibility).toFixed(4)+")");
      halo.addColorStop(.66,"rgba(19,38,72,"+(.11*sphereVisibility).toFixed(4)+")");
      halo.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=halo;
      ctx.beginPath();ctx.arc(cx,cy,r*1.11,0,TAU);ctx.fill();
    }
    // Do not suddenly clip a galaxy as the glass becomes visible. Distant
    // members fade gradually at the emerging edge as the field contracts.
    const rotated=points.map((p,i)=>{
      const ax=p.x*Math.cos(yaw)+p.z*Math.sin(yaw);
      const az=p.z*Math.cos(yaw)-p.x*Math.sin(yaw);
      const ay=p.y*Math.cos(pitch)-az*Math.sin(pitch);
      const depth=p.y*Math.sin(pitch)+az*Math.cos(pitch);
      return {...p,i,px:ax,py:ay,depth};
    }).sort((a,b)=>a.depth-b.depth);
    for(const p of rotated){
      const perspective=1+p.depth*.15;
      const x=cx+p.px*r*zoom*perspective;
      const y=cy+p.py*r*zoom*perspective;
      if(x<-35||x>w+35||y<-35||y>h+35)continue;
      // Extended view starts with only the known last galaxy visible;
      // each individual cluster member emerges softly at its own distance.
      const local=alpha*smooth((reveal-.025-random(p.i*11+7)*.16)/.30);
      if(local<.002)continue;
      // A few nearby spirals have enough apparent diameter for their arms to
      // remain visible on a phone; the rest stay as tiny galaxies.
      const prominent=p.i%23===0?2.15:p.i%9===0?1.4:1;
      const size=Math.max(2,r*(.052+p.size*.076)*zoom*perspective*prominent);
      const radial=Math.hypot((x-cx)/r,(y-cy)/r);
      const feather=1-sphereVisibility*smooth((radial-.84)/.32);
      const opacity=local*p.opacity*feather*
        (.91+.09*Math.sin(now*.00061+p.phase));
      if(opacity<.003)continue;
      ctx.globalAlpha=opacity;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(p.phase+held*.000006*(p.i%3===0?-1:1));
      ctx.drawImage(textures[p.variant],-size/2,-size/2,size,size);
      ctx.restore();
    }
    ctx.restore();
    // Highlights REVEAL the enclosing sphere only after the already-visible
    // galaxies have contracted into it; no opaque circular scene transition.
    if(sphereVisibility>.002){
      ctx.save();
      ctx.globalAlpha=sphereVisibility;
      const rim=ctx.createRadialGradient(cx-r*.36,cy-r*.43,r*.11,cx,cy,r*1.02);
      rim.addColorStop(0,"rgba(170,204,239,.034)");
      rim.addColorStop(.68,"rgba(38,80,137,.012)");
      rim.addColorStop(.88,"rgba(107,166,213,.06)");
      rim.addColorStop(.98,"rgba(203,234,255,.19)");
      rim.addColorStop(1,"rgba(186,222,255,0)");
      ctx.fillStyle=rim;ctx.beginPath();ctx.arc(cx,cy,r*1.02,0,TAU);ctx.fill();
      ctx.strokeStyle="rgba(194,226,255,.36)";
      ctx.lineWidth=Math.max(.6,Math.min(1.1,r*.005));
      ctx.beginPath();ctx.arc(cx,cy,r*.996,0,TAU);ctx.stroke();
      ctx.strokeStyle="rgba(238,249,255,.62)";
      ctx.lineWidth=Math.max(.6,Math.min(1.4,r*.006));
      // The short specular arc and highlight slowly travel over the glass
      // independently of the entire orb's drifting position.
      const roll=held*.000087;
      ctx.beginPath();
      ctx.arc(cx,cy,r*.993,Math.PI*1.12+roll,Math.PI*1.60+roll);ctx.stroke();
      const gx=cx+Math.cos(-2.25+roll)*r*.61;
      const gy=cy+Math.sin(-2.25+roll)*r*.61;
      const glint=ctx.createRadialGradient(gx,gy,0,gx,gy,r*.19);
      glint.addColorStop(0,"rgba(238,249,255,.62)");
      glint.addColorStop(.27,"rgba(198,233,255,.25)");
      glint.addColorStop(1,"rgba(135,205,255,0)");
      ctx.fillStyle=glint;
      ctx.beginPath();ctx.arc(gx,gy,r*.19,0,TAU);ctx.fill();
      ctx.restore();
    }
    // The final three minutes have quiet, intermittent grains attracted from
    // the surrounding starfield. Different starts, curved tracks and speeds;
    // no fan blades, identical loops or explosive particle showers.
    if(sphereVisibility>.55){
      ctx.save();
      const strength=smooth((sphereVisibility-.55)/.35);
      for(let i=0;i<92;i++){
        const period=3000+random(i*19+31)*3600;
        const cycle=(now+random(i*29+43)*period*3)/period;
        const age=cycle-Math.floor(cycle);
        if(age<.14||age>.92||random(i*13+19)<.34)continue;
        const t=smooth((age-.14)/.78);
        const angle=random(i*31+17)*TAU;
        const far=r*(1.36+random(i*41+109)*1.23);
        const sx=cx+Math.cos(angle)*far;
        const sy=cy+Math.sin(angle)*far;
        const targetAngle=angle+.28*(random(i*37+131)-.5);
        const ex=cx+Math.cos(targetAngle)*r*.63;
        const ey=cy+Math.sin(targetAngle)*r*.63;
        const bend=(random(i*47+23)-.5)*r*.40*Math.sin(t*Math.PI);
        const x=lerp(sx,ex,t)-Math.sin(angle)*bend;
        const y=lerp(sy,ey,t)+Math.cos(angle)*bend;
        if(x<0||x>w||y<0||y>h)continue;
        const vanish=(1-smooth((t-.65)/.35))*smooth(t/.17);
        const opacity=strength*vanish*(.15+.45*random(i*53+13));
        if(opacity<.01)continue;
        const size=.22+random(i*59+41)*.52;
        ctx.fillStyle="rgba(218,233,251,"+opacity.toFixed(3)+")";
        ctx.fillRect(x,y,size,size);
      }
      ctx.restore();
    }
  }
  return {draw};
}
