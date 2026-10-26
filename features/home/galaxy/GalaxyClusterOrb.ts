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
  const irregular=variant===3;
  // Two recognisable spirals, three edge-on/elliptical systems, one irregular.
  // Individual galaxies must not resemble spheres or a cluster of planets.
  const arms=variant===0?2:variant===4?3:0;
  for(let i=0;i<1030;i++){
    const rad=Math.sqrt(random(i*13+variant*397+9));
    let theta=TAU*random(i*41+variant*29+11);
    const arm=arms ? i%arms : 0;
    if(arms){
      theta=TAU*arm/arms+rad*5.2+(random(i*27+variant*37)-.5)*(.85+.3*rad);
    }
    const axial=elliptical?.23:irregular?.72:.58;
    const distance=rad*(8+48*random(i*17+variant*97));
    const lopsided=irregular?Math.sin(theta*2.4+variant)*8:0;
    const x=center+Math.cos(theta)*(distance+lopsided);
    const y=center+Math.sin(theta)*(distance-lopsided*.3)*axial;
    const luminosity=Math.pow(1-rad,.42);
    const alpha=(.23+.76*luminosity)*(.42+.58*random(i*53+17));
    const r=.28+random(i*7+variant*33)*(.43+luminosity*1.1);
    g.fillStyle="rgba("+rgb.join(",")+","+alpha.toFixed(3)+")";
    g.fillRect(x,y,r,r);
  }
  // Flattened luminous bulge and a faint dust lane prevent the 'planet'
  // silhouette at small sizes. The nuclei are larger than a pinpoint.
  g.save();
  g.translate(center,center);
  g.scale(1,elliptical?.46:irregular?.76:.67);
  const coreRadius=elliptical?25:17;
  const nucleus=g.createRadialGradient(0,0,0,0,0,coreRadius);
  nucleus.addColorStop(0,"rgba(255,252,244,1)");
  nucleus.addColorStop(.18,"rgba(255,238,212,.93)");
  nucleus.addColorStop(.52,"rgba("+rgb.join(",")+",.65)");
  nucleus.addColorStop(1,"rgba("+rgb.join(",")+",0)");
  g.fillStyle=nucleus;
  g.beginPath();g.arc(0,0,coreRadius,0,TAU);g.fill();
  if(elliptical&&variant===5){
    g.fillStyle="rgba(8,12,27,.20)";
    g.beginPath();g.ellipse(0,4,39,1.3,-.06,0,TAU);g.fill();
  }
  g.restore();
  return c;
}
function makePoints():GalaxyPoint[] {
  const knots=Array.from({length:15},(_,i)=>{
    // Spherical knot distribution rather than a square point catalogue.
    // Filament interpolation fills space organically, with no four corners.
    const bearing=random(i*37+201)*TAU;
    const elevation=(random(i*31+331)-.5)*Math.PI;
    const radius=.26+.60*Math.pow(random(i*53+431),.60);
    return {x:Math.cos(bearing)*Math.cos(elevation)*radius,
      y:Math.sin(bearing)*Math.cos(elevation)*radius,
      z:Math.sin(elevation)*radius};
  });
  // Irregular clustered filaments: not a grid of planets or a regular spiral.
  return Array.from({length:118},(_,i)=>{
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
    const reveal=smooth((step-154)/30);
    if(reveal<=.001)return;
    const short=Math.min(w,h);
    // Slightly larger than the first approved orb; always fit on a phone.
    const r=short*.405;
    const sphereVisibility=smooth((reveal-.62)/.35);
    // One widening camera, without a gallery of pictures sliding from the
    // edge of the display. Their bearings remain in the same sky.
    const zoom=Math.exp(Math.log(2.20)*(1-reveal));
    const held=Math.max(0,finalElapsed??0);
    const drift=sphereVisibility*smooth(held/1900);
    // Fixed cosmic sightline: each miniature system is already somewhere
    // in this large field; expanding FOV gradually resolves its light.
    const centreX=w*.515;
    const centreY=h*.515;
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
      // Every individual galaxy emerges on its own gradual schedule;
      // never light up the entire collection on one tap.
      const depthDelay=(p.depth+1)*.09;
      const local=alpha*smooth((reveal-.07-depthDelay-
        random(p.i*11+7)*.24)/.38);
      if(local<.002)continue;
      // A few nearby spirals have enough apparent diameter for their arms to
      // remain visible on a phone; the rest stay as tiny galaxies.
      // A few recognisable, resolved galaxies among many small systems.
      // Reducing the number of overlapping glows lets their shapes read.
      const prominent=p.i%13===0?2.35:p.i%7===0?1.55:1;
      const size=Math.max(2,r*(.029+p.size*.058)*zoom*perspective*prominent);
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
      // Subtle cool refraction and shifting specular glints convey thick
      // transparent glass without hiding the separate galaxy silhouettes.
      const rim=ctx.createRadialGradient(cx-r*.36,cy-r*.43,r*.11,cx,cy,r*1.02);
      rim.addColorStop(0,"rgba(170,204,239,.034)");
      rim.addColorStop(.68,"rgba(38,80,137,.012)");
      rim.addColorStop(.84,"rgba(102,164,212,.07)");
      rim.addColorStop(.955,"rgba(192,229,255,.20)");
      rim.addColorStop(.992,"rgba(235,247,255,.29)");
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
      // Reflection of a long softbox across the front hemisphere.
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(roll*.63);
      ctx.beginPath();ctx.arc(0,0,r*.88,Math.PI*.93,Math.PI*1.34);
      ctx.strokeStyle="rgba(223,246,255,.15)";
      ctx.lineWidth=Math.max(1.3,r*.013);ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,r*.70,Math.PI*.98,Math.PI*1.27);
      ctx.strokeStyle="rgba(222,242,255,.095)";
      ctx.lineWidth=Math.max(1,r*.035);ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
    // Sparkling stardust keeps arriving from every direction for the full
    // three-minute drift. These are distinct irregular curved trajectories,
    // never a synchronous ring or a shower from one side of the viewport.
    if(sphereVisibility>.42){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      const strength=smooth((sphereVisibility-.42)/.46);
      for(let i=0;i<178;i++){
        const period=3400+random(i*19+31)*5200;
        const cycle=(now+random(i*29+43)*period*3)/period;
        const age=cycle-Math.floor(cycle);
        if(age<.06||age>.96||random(i*13+19)<.22)continue;
        const t=smooth((age-.06)/.90);
        const angle=random(i*31+17)*TAU;
        const far=r*(1.24+random(i*41+109)*1.48);
        const sx=cx+Math.cos(angle)*far;
        const sy=cy+Math.sin(angle)*far;
        const targetAngle=angle+.36*(random(i*37+131)-.5);
        const ex=cx+Math.cos(targetAngle)*r*.62;
        const ey=cy+Math.sin(targetAngle)*r*.62;
        const bend=(random(i*47+23)-.5)*r*.49*Math.sin(t*Math.PI);
        const x=lerp(sx,ex,t)-Math.sin(angle)*bend;
        const y=lerp(sy,ey,t)+Math.cos(angle)*bend;
        if(x<1||x>w-1||y<1||y>h-1)continue;
        const vanish=(1-smooth((t-.68)/.32))*smooth(t/.10);
        const twinkle=.65+.35*Math.sin(now*.006+i*3.7)**2;
        const opacity=strength*vanish*twinkle*(.36+.56*random(i*53+13));
        if(opacity<.017)continue;
        const size=.55+random(i*59+41)*.92;
        const cool=i%4!==0;
        ctx.fillStyle=cool
          ?"rgba(203,232,255,"+opacity.toFixed(3)+")"
          :"rgba(255,223,187,"+opacity.toFixed(3)+")";
        ctx.beginPath();ctx.arc(x,y,size,0,TAU);ctx.fill();
        if(i%5===0){
          const glow=ctx.createRadialGradient(x,y,0,x,y,4.7+size*2.2);
          glow.addColorStop(0,"rgba(237,247,255,"+(opacity*.41).toFixed(3)+")");
          glow.addColorStop(1,"rgba(180,220,255,0)");
          ctx.fillStyle=glow;ctx.beginPath();
          ctx.arc(x,y,4.7+size*2.2,0,TAU);ctx.fill();
          if(i%15===0){
            ctx.strokeStyle="rgba(238,248,255,"+(opacity*.47).toFixed(3)+")";
            ctx.lineWidth=.55;
            ctx.beginPath();ctx.moveTo(x-3.5,y);ctx.lineTo(x+3.5,y);
            ctx.moveTo(x,y-3.5);ctx.lineTo(x,y+3.5);ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
  }
  return {draw};
}
