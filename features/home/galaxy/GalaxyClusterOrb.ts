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
  // A DISTINCT deterministic galaxy for each individual cluster member.
  // Seven morphological families, with a different spiral winding, disc
  // aspect, core asymmetry, hue and star distribution for every instance.
  // One small transparent canvas per member, built lazily over many frames.
  const c=document.createElement("canvas");
  const n=160,mid=n*.5;
  c.width=c.height=n;
  const g=c.getContext("2d",{alpha:true});
  if(!g)return c;
  const family=variant%7;
  const palette=[
    [184,215,255],[242,211,178],[216,204,244],[186,228,228],
    [240,191,204],[192,205,233],[215,228,245],[229,198,176],
  ][Math.floor(random(variant*37+19)*8)];
  const base=palette.join(",");
  const ellipse=family===1||family===5;
  const edgeOn=family===4;
  const irregular=family===6;
  const barred=family===3;
  const arms=family===0||family===3?2:family===2?3:0;
  const axial=edgeOn?.22+.13*random(variant*17+21):
    ellipse?.59+.28*random(variant*29+33):
    irregular?.68+.26*random(variant*31+17):
    .56+.30*random(variant*23+91);
  const winding=(2.8+3.7*random(variant*71+39))*
    (variant%3===0?-1:1);
  const startAngle=TAU*random(variant*59+13);
  const lop=.03+.11*random(variant*83+23);
  g.save();g.translate(mid,mid);

  // Soft, slightly offset stellar body, never a repeated oval texture.
  const offsetX=(random(variant*47+21)-.5)*n*.055;
  const offsetY=(random(variant*43+61)-.5)*n*.035;
  g.save();g.translate(offsetX,offsetY);g.scale(1,axial);
  const halo=g.createRadialGradient(0,0,0,0,0,n*.49);
  const bright=irregular?.40:ellipse?.57:.50;
  halo.addColorStop(0,"rgba("+base+","+(bright*.89).toFixed(3)+")");
  halo.addColorStop(.16,"rgba("+base+","+(bright*.39).toFixed(3)+")");
  halo.addColorStop(.58,"rgba("+base+","+(bright*.072).toFixed(3)+")");
  halo.addColorStop(1,"rgba("+base+",0)");
  g.fillStyle=halo;g.beginPath();g.arc(0,0,n*.49,0,TAU);g.fill();
  g.restore();

  for(let j=0;j<43;j++){
    const r=.06+.88*random(j*29+variant*71+31);
    const a=startAngle+TAU*random(j*37+variant*89)+r*.6;
    const x=offsetX+Math.cos(a)*n*.40*r;
    const y=offsetY+Math.sin(a)*n*.38*r*axial;
    const radius=n*(.016+.027*random(j*53+variant*107));
    const neb=g.createRadialGradient(x,y,0,x,y,radius);
    const strength=(.036+.115*(1-r))*(irregular?1.12:1);
    const tint=j%7===0?"255,198,178":j%5===0?"141,188,255":base;
    neb.addColorStop(0,"rgba("+tint+","+strength.toFixed(3)+")");
    neb.addColorStop(1,"rgba("+tint+",0)");
    g.fillStyle=neb;g.beginPath();g.arc(x,y,radius,0,TAU);g.fill();
  }

  // Unique, broad and broken stellar arms. Diffuse stars prevent a stamped
  // whirlpool; no perfectly straight luminous ridge or uniform rings.
  for(let j=0;j<1750;j++){
    const r=Math.pow(random(j*17+variant*151+29),.79);
    const diffuse=random(j*23+variant*109+31)<
      (ellipse?1:edgeOn?.88:irregular?.80:.43);
    const lane=arms?j%arms:0;
    const theta=!diffuse&&arms
      ?startAngle+lane*TAU/arms+winding*r+
       (random(j*41+variant*73)-.5)*(.81+.57*r)
      :startAngle+TAU*random(j*31+variant*127);
    const scatter=(random(j*61+variant*47)-.5)*(.08+.11*r);
    const bend=1+lop*Math.sin(theta*2.2+variant*.67+r*3.7);
    const x=offsetX+Math.cos(theta)*(r+scatter)*n*.43*bend;
    const y=offsetY+Math.sin(theta)*(r+scatter)*n*.43*axial/bend;
    const rim=1-smooth((r-.75)/.25);
    const density=Math.pow(1-r,ellipse?.41:.68);
    const alpha=(.15+.72*density)*rim*
      (.44+.56*random(j*67+variant*79));
    if(alpha<.009)continue;
    const tint=j%11===0?"255,226,196":j%7===0?"172,208,255":base;
    g.fillStyle="rgba("+tint+","+alpha.toFixed(3)+")";
    const size=.22+.92*random(j*71+variant*53);
    g.fillRect(x,y,size,size);
  }
  // One softly embedded nucleus per galaxy (offset for the irregulars).
  g.save();g.translate(offsetX,offsetY);
  g.scale(1,edgeOn?.48:ellipse?.80:.66);
  const coreRadius=irregular?19:ellipse?30:25;
  const core=g.createRadialGradient(0,0,0,0,0,coreRadius);
  core.addColorStop(0,"rgba(255,246,229,"+(irregular?.60:.91)+")");
  core.addColorStop(.18,"rgba(255,231,208,.67)");
  core.addColorStop(.51,"rgba("+base+",.30)");
  core.addColorStop(1,"rgba("+base+",0)");
  g.fillStyle=core;g.beginPath();g.arc(0,0,coreRadius,0,TAU);g.fill();
  if(edgeOn){
    // Uneven dusty lane, not a white line or a perfectly ruled stripe.
    g.save();g.rotate((random(variant*101+9)-.5)*.18);
    g.fillStyle="rgba(9,15,35,.15)";
    g.beginPath();g.ellipse(1.8,2.2,38,1.6,0,0,TAU);g.fill();
    g.restore();
  }
  g.restore();
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
      // No exact duplicate galaxy silhouette anywhere in the glass.
      variant:i,
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
  const sprites:(HTMLCanvasElement|null)[]=Array.from(
    {length:158},()=>null);
  // Keep creation spread across many frames on phones: drawing 158 distinct
  // galactic star fields in one synchronous burst would stall interaction.
  function ensureSprite(variant:number,budget:{left:number}){
    if(sprites[variant])return sprites[variant];
    if(budget.left<=0)return null;
    budget.left--;
    const result=galaxySprite(variant);
    sprites[variant]=result;
    return result;
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
    const newSpriteBudget={left:4};
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
      const texture=ensureSprite(p.variant,newSpriteBudget);
      if(!texture)continue;
      ctx.globalAlpha=opacity;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(p.phase+held*.000006*(p.i%3===0?-1:1));
      // Individual galaxies have different orientations in space:
      // broad face-on spirals, tilted ellipses and slim edge-on discs.
      // Keep their cores 3-D and vary the tilt gently as the ball turns.
      const tilt=.77+.20*Math.sin(yaw*.58+p.phase+p.depth);
      ctx.scale(1,tilt);
      ctx.drawImage(texture,-size/2,-size/2,size,size);
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
