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
  return Array.from({length:158},(_,i)=>{
    // A smaller, diffuse population sits BETWEEN filament galaxies; it
    // removes the artificial boxed-in cluster while retaining density peaks.
    const diffuse=i>=118;
    let x:number,y:number,z:number;
    if(diffuse){
      const bearing=TAU*random(i*47+137);
      const latitude=(random(i*79+381)-.5)*Math.PI;
      const rad=.35+.56*Math.sqrt(random(i*61+377));
      x=Math.cos(bearing)*Math.cos(latitude)*rad;
      y=Math.sin(bearing)*Math.cos(latitude)*rad;
      z=Math.sin(latitude)*rad;
    } else {
      const anchor=knots[Math.floor(random(i*17+14)*knots.length)];
      const other=knots[Math.floor(random(i*19+103)*knots.length)];
      const t=random(i*47+87);
      const spread=i%4===0?.14:.065;
      x=lerp(anchor.x,other.x,t)+(random(i*59+121)-.5)*spread*2;
      y=lerp(anchor.y,other.y,t)+(random(i*61+231)-.5)*spread*2;
      z=lerp(anchor.z,other.z,t)+(random(i*67+311)-.5)*spread*2;
    }
    const d=Math.hypot(x,y,z);
    if(d>.91){x*=.91/d;y*=.91/d;z*=.91/d;}
    return {
      x,y,z,
      size:(.42+Math.pow(random(i*71+19),2)*2.35)*(diffuse?.70:1),
      phase:random(i*73+31)*TAU,
      variant:Math.floor(random(i*79+91)*6),
      opacity:(.53+random(i*83+19)*.47)*(diffuse?.65:1),
    };
  });
}
export function createGalaxyClusterOrb() {
  const points=makePoints();
  // A separate, truly full-frame deep sky, not the former compact square
  // patch around the nebula. Fixed coordinates make paused frames stable.
  // During the final three minutes a changing subset of the tiny stars
  // spirals into the glass sphere; other distant stars stay visible.
  const ambientStars=Array.from({length:1150},(_,i)=>({
    u:random(i*107+817),
    v:random(i*139+1913),
    radius:.18+random(i*23+621)*.88,
    brightness:.23+random(i*37+299)*.69,
    phase:random(i*67+913)*TAU,
    hue:i%9===0?36:i%13===0?279:208+Math.floor(random(i*53+211)*33),
  }));
  function drawFullSky(
    ctx:CanvasRenderingContext2D,w:number,h:number,now:number,
    reveal:number,sphereVisibility:number,cx:number,cy:number,r:number,
  ){
    const emerging=smooth((reveal-.012)/.30);
    if(emerging<.001)return;
    ctx.save();
    for(let i=0;i<ambientStars.length;i++){
      const p=ambientStars[i];
      const sx=p.u*w,sy=p.v*h;
      let x=sx,y=sy,vanish=1;
      // These are stars throughout the visible sky rather than a square
      // sample near the glass. Each captured star follows its own bent,
      // asynchronous track. The field is replenished by farther stars.
      if(sphereVisibility>.15 && i%3===0){
        const cycleMs=5800+random(i*61+721)*6700;
        const phase=(now/cycleMs+random(i*41+331)*5)%1;
        const approach=smooth((phase-.10)/.83);
        const bearing=Math.atan2(sy-cy,sx-cx);
        const landing=.42+.30*random(i*71+433);
        const tx=cx+Math.cos(bearing)*r*landing;
        const ty=cy+Math.sin(bearing)*r*landing;
        const curve=r*(random(i*79+83)-.5)*.39*
          Math.sin(Math.PI*approach);
        const absorbed=approach*smooth((sphereVisibility-.15)/.53);
        x=sx+(tx-sx)*absorbed-Math.sin(bearing)*curve*absorbed;
        y=sy+(ty-sy)*absorbed+Math.cos(bearing)*curve*absorbed;
        vanish=1-smooth((approach-.70)/.27)*
          smooth((sphereVisibility-.15)/.53);
      }
      if(x<-5||x>w+5||y<-5||y>h+5)continue;
      const twinkle=.69+.31*Math.sin(now*.0018+p.phase)**2;
      const a=emerging*p.brightness*twinkle*vanish;
      if(a<.008)continue;
      ctx.fillStyle="hsla("+p.hue+",57%,91%,"+a.toFixed(3)+")";
      ctx.fillRect(x,y,p.radius,p.radius);
      // Widely separated prismatic glints: more bright stars without
      // making a flat, uniform wallpaper or a regular particle grid.
      if(i%47===0){
        const pulse=.55+.45*Math.sin(now*.0031+p.phase)**2;
        const glow=ctx.createRadialGradient(x,y,0,x,y,6.3);
        glow.addColorStop(0,"rgba(227,242,255,"+(a*.42*pulse).toFixed(3)+")");
        glow.addColorStop(1,"rgba(147,196,246,0)");
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,6.3,0,TAU);ctx.fill();
        if(i%141===0){
          ctx.strokeStyle="rgba(235,244,255,"+(a*.37*pulse).toFixed(3)+")";
          ctx.lineWidth=.55;
          ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);
          ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
  // Lazy texture construction: no work or remote image transfer until needed.
  let sprites:HTMLCanvasElement[]|null=null;
  function ensureSprites(){
    if(!sprites)sprites=Array.from({length:6},(_,i)=>galaxySprite(i));
    return sprites;
  }
  // This glass is a cached optical layer, not a set of ideal concentric
  // vector rings. Broad, irregular reflections and an angle-dependent edge
  // imply a clear curved surface without hiding the enclosed galaxies.
  let glassOptics:HTMLCanvasElement|null=null;
  function ensureGlassOptics():HTMLCanvasElement {
    if(glassOptics)return glassOptics;
    const n=768,mid=n*.5,rad=n*.489;
    const c=document.createElement("canvas");
    c.width=c.height=n;
    const g=c.getContext("2d",{alpha:true});
    if(!g){glassOptics=c;return c;}
    // Capture the narrowed, non-null canvas context for nested helpers.
    const glassCtx:CanvasRenderingContext2D=g;
    const disc=new Path2D();
    disc.arc(mid,mid,rad,0,TAU);
    // Very slight cool transmission and local glass thickness. This
    // fades seamlessly; nothing like a uniform blue circular fill.
    g.save();g.clip(disc);
    const volume=g.createRadialGradient(mid-n*.13,mid-n*.15,n*.08,mid,mid,rad);
    volume.addColorStop(0,"rgba(208,236,255,.007)");
    volume.addColorStop(.68,"rgba(125,171,219,.009)");
    volume.addColorStop(.84,"rgba(103,161,218,.022)");
    volume.addColorStop(.944,"rgba(158,201,236,.052)");
    volume.addColorStop(.975,"rgba(182,227,255,.12)");
    volume.addColorStop(1,"rgba(82,133,193,.025)");
    g.fillStyle=volume;g.fillRect(0,0,n,n);
    // Uneven shadow on the far underside of the glass: only close to the
    // edge; the galaxies remain visible and distinct through the centre.
    const shade=g.createRadialGradient(mid+n*.13,mid+n*.14,rad*.45,
      mid+n*.08,mid+n*.07,rad*1.17);
    shade.addColorStop(0,"rgba(0,8,24,0)");
    shade.addColorStop(.82,"rgba(0,8,24,.009)");
    shade.addColorStop(1,"rgba(0,6,19,.10)");
    g.fillStyle=shade;g.fillRect(0,0,n,n);
    // Reflections are soft elliptical patches rather than painted curved
    // bars. Each has different scale, angle and falloff.
    function softReflection(
      x:number,y:number,rx:number,ry:number,angle:number,opacity:number,
      rgb:string,
    ){
      glassCtx.save();glassCtx.translate(x,y);glassCtx.rotate(angle);glassCtx.scale(rx,ry);
      const q=glassCtx.createRadialGradient(-.14,-.13,.03,0,0,1);
      q.addColorStop(0,"rgba("+rgb+","+opacity.toFixed(3)+")");
      q.addColorStop(.27,"rgba("+rgb+","+(opacity*.54).toFixed(3)+")");
      q.addColorStop(.65,"rgba("+rgb+","+(opacity*.15).toFixed(3)+")");
      q.addColorStop(1,"rgba("+rgb+",0)");
      glassCtx.fillStyle=q;glassCtx.beginPath();glassCtx.arc(0,0,1,0,TAU);glassCtx.fill();
      glassCtx.restore();
    }
    // An off-axis light source leaves a broad luminous smear high on the
    // left of the glass, tapering into smaller, much dimmer glints.
    softReflection(mid-rad*.37,mid-rad*.58,rad*.28,rad*.13,-.48,.14,"235,248,255");
    softReflection(mid-rad*.51,mid-rad*.27,rad*.12,rad*.29,.42,.07,"198,228,250");
    softReflection(mid+rad*.62,mid+rad*.48,rad*.20,rad*.09,-.28,.045,"176,212,246");
    softReflection(mid-rad*.56,mid-rad*.64,rad*.08,rad*.053,.35,.20,"251,252,255");
    g.restore();

    // The silhouette is extremely faint away from the light. Smooth
    // changing thickness, colour and brightness along its circumference
    // prevents a uniform vector-circle or a repeated mechanical arc.
    for(let i=0;i<320;i++){
      const angle=i*TAU/320;
      const main=Math.pow(Math.max(0,Math.cos(angle+2.28)),4.2);
      const lower=Math.pow(Math.max(0,Math.cos(angle-.83)),10);
      const upper=Math.pow(Math.max(0,Math.cos(angle+1.47)),12);
      const wobble=.83+.17*Math.sin(angle*7.3+.7)*Math.sin(angle*13.1+1.9);
      const opacity=(.016+.36*main+.095*lower+.08*upper)*wobble;
      const thickness=.64+1.08*main+.33*upper;
      const rr=rad-.8+.32*Math.sin(angle*5.2+1);
      const from=angle-.0027,to=angle+TAU/320+.0027;
      // A diffuse refracted colour outside the sharp highlight.
      g.strokeStyle="rgba(128,188,235,"+(opacity*.28).toFixed(4)+")";
      g.lineWidth=thickness*3.3;
      g.beginPath();g.arc(mid,mid,rr-1.0,from,to);g.stroke();
      // Only local reflections become brighter. Most of the edge nearly
      // disappears, exactly as a clear sphere against a dark sky would.
      g.strokeStyle="rgba(235,246,255,"+opacity.toFixed(4)+")";
      g.lineWidth=thickness;
      g.beginPath();g.arc(mid,mid,rr,from,to);g.stroke();
    }
    glassOptics=c;
    return c;
  }

  // Keep the final sphere and the departing MAIN galaxy on the same
  // sightline. The lead galaxy is not replaced by a different illustration:
  // it becomes one member of this widening, increasingly populated view.
  function geometry(w:number,h:number,step:number,finalElapsed:number|null){
    const reveal=smooth((step-154)/30);
    const short=Math.min(w,h);
    const r=short*.405;
    const sphereVisibility=smooth((reveal-.62)/.35);
    const zoom=1+3.8*Math.pow(1-reveal,1.1);
    const held=Math.max(0,finalElapsed??0);
    const drift=sphereVisibility*smooth(held/1900);
    const centreX=w*.515,centreY=h*.515;
    const wanderX=Math.min(w*.14,68)*
      (.55*Math.sin(held*.00034)+.29*Math.sin(held*.000157+1.7)
       +.16*Math.sin(held*.000091+.6));
    const wanderY=Math.min(h*.20,114)*
      (.49*Math.sin(held*.000255+.4)+.33*Math.sin(held*.000113+2)
       +.18*Math.sin(held*.000062+.9));
    const cx=lerp(centreX,clamp(centreX+drift*wanderX,r+8,w-r-8),drift);
    const cy=lerp(centreY,clamp(centreY+drift*wanderY,r+12,h-r-12),drift);
    const alpha=smooth((reveal-.015)/.54);
    // A known member of the same 3-D galaxy group is the original lead
    // galaxy from the voyage. Give it the SAME yaw/pitch/perspective as the
    // other members so it neither freezes nor becomes a flat stationary
    // plate during the three-minute glass observation.
    const yaw=held*.000058+Math.sin(held*.000089)*.22;
    const pitch=held*.000044+Math.sin(held*.000063+1.4)*.18;
    const lx=-.31,ly=.24,lz=.18;
    const leadAx=lx*Math.cos(yaw)+lz*Math.sin(yaw);
    const leadAz=lz*Math.cos(yaw)-lx*Math.sin(yaw);
    const leadAy=ly*Math.cos(pitch)-leadAz*Math.sin(pitch);
    const leadDepth=ly*Math.sin(pitch)+leadAz*Math.cos(pitch);
    const leadPerspective=clamp(1/(1-.57*leadDepth),.67,1.75);
    const leadX=cx+leadAx*r*.94*leadPerspective;
    const leadY=cy+leadAy*r*.94*leadPerspective;
    return {reveal,r,sphereVisibility,zoom,held,cx,cy,alpha,
      yaw,pitch,leadX,leadY,leadPerspective};
  }

  function draw(
    ctx:CanvasRenderingContext2D,w:number,h:number,step:number,
    now:number,finalElapsed:number|null,
  ){
    // Start alongside the off-axis star cloud, not with a different giant
    // spiral appearing in the centre. Each tap opens more of the same region.
    const {reveal,r,sphereVisibility,zoom,held,cx,cy,alpha,yaw,pitch}=
      geometry(w,h,step,finalElapsed);
    if(reveal<=.001)return;
    // The same 3-D rotation controls all galaxy positions and sizes.
    const textures=ensureSprites();
    // The sky must remain rich from edge to edge, even before any galaxy
    // becomes large enough to identify, and long after the sphere appears.
    drawFullSky(ctx,w,h,now,reveal,sphereVisibility,cx,cy,r);
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
      // True depth cue: galaxies behind the centre are smaller and dimmer,
      // nearby galaxies become larger and brighter as the system rotates.
      const perspective=clamp(1/(1-.57*p.depth),.67,1.75);
      // Previously these clustered filaments were visible as a conspicuous
      // rectangle of point lights BEFORE the sphere existed. Give every
      // member its own bearing across the full celestial field, then reveal
      // its actual three-dimensional place by continuous camera pullback.
      const broadX=w*(.025+.95*random(p.i*101+1709));
      const broadY=h*(.02+.96*random(p.i*131+3119));
      const settle=smooth((reveal-.19-random(p.i*29+17)*.08)/.72);
      const x=lerp(broadX,cx+p.px*r*zoom*perspective,settle);
      const y=lerp(broadY,cy+p.py*r*zoom*perspective,settle);
      if(x<-35||x>w+35||y<-35||y>h+35)continue;
      // Extended view starts with only the known last galaxy visible;
      // each individual cluster member emerges softly at its own distance.
      // Every individual galaxy emerges on its own gradual schedule;
      // never light up the entire collection on one tap.
      const depthDelay=(p.depth+1)*.09;
      const local=alpha*smooth((reveal-.05-depthDelay-
        random(p.i*11+7)*.31)/.48);
      if(local<.002)continue;
      // A few nearby spirals have enough apparent diameter for their arms to
      // remain visible on a phone; the rest stay as tiny galaxies.
      // A few recognisable, resolved galaxies among many small systems.
      // Reducing the number of overlapping glows lets their shapes read.
      const prominent=p.i%13===0?1.65:p.i%7===0?1.32:1;
      // Apparent positions follow camera distance more strongly than the
      // individual light discs. This keeps early galaxies separate instead
      // of creating square patches of overlapping nebular sprites.
      const apparentDiameter=Math.pow(zoom,.48);
      const size=Math.max(.8,r*(.026+p.size*.054)*
        apparentDiameter*perspective*prominent*(.12+.88*settle));
      const radial=Math.hypot((x-cx)/r,(y-cy)/r);
      const feather=1-sphereVisibility*smooth((radial-.84)/.32);
      const depthLight=clamp(.85+.28*p.depth,.59,1.13);
      const opacity=local*p.opacity*feather*depthLight*
        (.45+.55*settle)*(.91+.09*Math.sin(now*.00061+p.phase));
      if(opacity<.003)continue;
      ctx.globalAlpha=opacity;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(p.phase+held*.000006*(p.i%3===0?-1:1));
      // Individual galaxies have different orientations in space:
      // broad face-on spirals, tilted ellipses and slim edge-on discs.
      // Keep their cores 3-D and vary the tilt gently as the ball turns.
      const tilt=.77+.20*Math.sin(yaw*.58+p.phase+p.depth);
      ctx.scale(1,tilt);
      ctx.drawImage(textures[p.variant],-size/2,-size/2,size,size);
      ctx.restore();
    }
    ctx.restore();
    // The galaxies never stop moving. At the last stage only a soft,
    // physically inspired optical skin is placed in front of them.
    // This deliberately removes the old full-circle outline and the two
    // dark, perfect internal arcs that resembled mechanical hardware.
    if(sphereVisibility>.002){
      ctx.save();
      ctx.globalAlpha=sphereVisibility;
      const optical=ensureGlassOptics();
      ctx.drawImage(optical,cx-r*1.023,cy-r*1.023,r*2.046,r*2.046);
      // Minute changes in the light source during the three-minute drift.
      // No spinning arcs or repeated fixed-pattern reflection lines.
      if(finalElapsed!==null){
        const glowX=cx-r*.42+Math.sin(held*.00017)*r*.026;
        const glowY=cy-r*.57+Math.sin(held*.00011+.8)*r*.020;
        const glow=ctx.createRadialGradient(glowX,glowY,0,glowX,glowY,r*.095);
        const brightness=.085+.04*Math.sin(held*.00012+.7)**2;
        glow.addColorStop(0,"rgba(243,251,255,"+brightness.toFixed(4)+")");
        glow.addColorStop(.45,"rgba(206,236,255,"+(brightness*.30).toFixed(4)+")");
        glow.addColorStop(1,"rgba(181,221,255,0)");
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(glowX,glowY,r*.095,0,TAU);ctx.fill();
      }
      ctx.restore();
    }
    // Sparkling stardust keeps arriving from every direction for the full
    // three-minute drift. These are distinct irregular curved trajectories,
    // never a synchronous ring or a shower from one side of the viewport.
    if(sphereVisibility>.42){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      const strength=smooth((sphereVisibility-.42)/.46);
      for(let i=0;i<235;i++){
        const period=3150+random(i*19+31)*4600;
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
  return {draw,geometry};
}
