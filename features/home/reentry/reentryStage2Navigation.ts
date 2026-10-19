/**
 * Stage 2 navigation prototype. Completely separate from Stage 1 Physics v1.1.
 * Coordinates are metres; heading 0° is north, positive clockwise.
 * Every result follows the player's inputs and deterministic wind/wave forces.
 * No random outcome roll.
 */
export type Stage2IslandId = "japan" | "antarctic" | "visitor";
export type Stage2End = "NOSE" | "MOUTH" | "SEA" | "SAND" | "REEF" | "TOO_FAST" | "MISSED";
export type Stage2Island = {
  id: Stage2IslandId; bearing: number; radius: number;
  x: number; y: number;
};
export type Stage2Nav = {
  x: number; y: number; vx: number; vy: number; heading: number;
  pitch: number; altitude: number; verticalSpeed: number;
  blood: number; throttle: number;
  targetSpeed: number; targetAltitude: number;
  seconds: number; launched: boolean;
  outcome: Stage2End | null; destination: Stage2IslandId | null;
};
// thrust: signed lever direction (-1 slow down, +1 speed up, 0 hold).
export type Stage2Input = { steerX: number; steerY: number; thrust: number };
export type Stage2Wind = { bearing: number; strength: number; arrow: string };
export const STAGE2_ISLANDS: readonly Stage2Island[] = [
  { id:"japan",bearing:35,radius:32,x:Math.sin(35*Math.PI/180)*425,y:Math.cos(35*Math.PI/180)*425 },
  { id:"antarctic",bearing:151,radius:35,x:Math.sin(151*Math.PI/180)*480,y:Math.cos(151*Math.PI/180)*480 },
  { id:"visitor",bearing:272,radius:30,x:Math.sin(272*Math.PI/180)*460,y:Math.cos(272*Math.PI/180)*460 },
];
// Even the highest zoom reveals only a rough shoreline at the starting range.
export const STAGE2_ZOOMS = [1,2,3,4,6] as const;
export const clamp = (v:number,lo:number,hi:number) => Math.max(lo,Math.min(hi,v));
export const wrap360 = (v:number) => (v%360+360)%360;
export function signedBearing(delta:number):number {
  return ((delta + 540)%360)-180;
}
export function bearingTo(x:number,y:number):number {
  return wrap360(Math.atan2(x,y)*180/Math.PI);
}
export function islandDistance(s:Stage2Nav,island:Stage2Island):number {
  return Math.hypot(island.x-s.x,island.y-s.y);
}
function localHour(now:Date,timeZone:string):number {
  const time = new Intl.DateTimeFormat("en-US",{
    timeZone,hour:"2-digit",hourCycle:"h23"
  }).format(now);
  return Number(time);
}
/**
 * There is always an outdoor polar-station worker on shift.
 * Japan beachgoers appear by local daylight, and visitors reach the otherwise
 * uninhabited island only in New York's 11:00-16:00 time window.
 * Thus exactly 1-2 active target sites exist across the day (NY hours do not
 * overlap Japanese local daytime during the current daylight-saving range).
 */
export function stage2Visitors(now:Date = new Date()):Record<Stage2IslandId,boolean> {
  const jp=localHour(now,"Asia/Tokyo");
  const ny=localHour(now,"America/New_York");
  return {
    japan: jp>=8&&jp<19,
    antarctic:true,
    visitor:ny>=11&&ny<16,
  };
}
export function stage2Wind(s:Stage2Nav):Stage2Wind {
  // Slowly varying directional breeze; the user can read both the force and
  // current directional arrow on the cockpit. Never sampled randomly.
  const bearing=wrap360(288+17*Math.sin(s.seconds*0.17)+9*Math.sin(s.seconds*0.047));
  const strength=clamp(Math.round(3.3+1.2*Math.sin(s.seconds*0.23)),1,5);
  const cardinal=Math.round(bearing/45)%8;
  const arrow=["↑","↗","→","↘","↓","↙","←","↖"][cardinal];
  return {bearing,strength,arrow};
}
export function initialStage2Nav():Stage2Nav {
  return {x:0,y:0,vx:0,vy:0,heading:0,pitch:0,altitude:2.05,
    verticalSpeed:0,blood:1,throttle:0,targetSpeed:0,targetAltitude:2.05,
    seconds:0,launched:false,
    outcome:null,destination:null};
}
/**
 * The coast is solid: if the craft has entered a beach radius and its
 * radial velocity changes from approaching to receding, the approach
 * resolves as a miss. Otherwise a near-miss could fly through the island
 * until it disappeared behind the forward-only camera, showing open sea
 * with no explanation.
 */
function resolveContact(s:Stage2Nav,people:Record<Stage2IslandId,boolean>):Stage2Nav {
  for(const island of STAGE2_ISLANDS) {
    const dist=islandDistance(s,island);
    if(dist>island.radius)continue;
    const speed=Math.hypot(s.vx,s.vy);
    const dx=island.x-s.x,dy=island.y-s.y;
    const direction=bearingTo(dx,dy);
    const incidence=Math.abs(signedBearing(direction-s.heading));
    const lateral=signedBearing(s.heading-island.bearing)*0.065;
    if(dist<8.5 && people[island.id] &&
      s.altitude>1.10 && s.altitude<2.60) {
      if(incidence<20 && speed>=2.4 && speed<=14.5){
        if(Math.abs(lateral+0.44)<0.46 && s.altitude<1.95)
          return {...s,outcome:"NOSE",destination:island.id};
        if(Math.abs(lateral-0.34)<0.55 && s.altitude>=1.75)
          return {...s,outcome:"MOUTH",destination:island.id};
      }
      if(speed>14.5)return {...s,outcome:"TOO_FAST",destination:island.id};
    }
    if(s.altitude<=0.65) {
      const reef=Math.abs(signedBearing(s.heading-island.bearing))>11;
      return {...s,outcome:reef?"REEF":"SAND",destination:island.id};
    }
    if(dist<2.8)return {...s,outcome:"SAND",destination:island.id};

    // Resolve at the nearest point of a missed fly-by rather than letting
    // the craft pass THROUGH an island and abruptly return to open sea.
    const movingAway=(s.x-island.x)*s.vx+(s.y-island.y)*s.vy;
    if(movingAway>=0 && speed>1.1) {
      return {...s,outcome:dist>11?"MISSED":"SAND",destination:island.id};
    }
  }
  if(s.altitude<=0.65)return {...s,outcome:"SEA"};
  if(s.seconds>120)return {...s,outcome:"MISSED"};
  return s;
}

/**
 * A true throttle lever: hold towards SPEED UP / SLOW DOWN to change
 * cruise speed; release to KEEP the selected speed. The onboard alien
 * organ spends blood continuously to maintain that speed. Faster cruise
 * costs more blood, while a modest slow cruise saves it.
 *
 * Vertical stick input modifies the persistent ALTITUDE SETPOINT.
 * Climbing costs a substantial one-time amount; descending a little;
 * holding altitude has a smaller background cost. Repeated climbing and
 * descending therefore wastes blood without silently moving the craft.
 */
export function stepStage2(
  old:Stage2Nav,input:Stage2Input,dt:number,
  people:Record<Stage2IslandId,boolean>,
):Stage2Nav {
  if(old.outcome)return old;
  const step=clamp(dt,0,0.05);
  const sx=clamp(input.steerX,-1,1);
  const sy=clamp(input.steerY,-1,1);
  const lever=clamp(input.thrust,-1,1);

  const heading=wrap360(old.heading+sx*66*step);
  const targetAltitude=clamp(old.targetAltitude+sy*4.1*step,0.9,11.5);
  const targetAltitudeChange=targetAltitude-old.targetAltitude;
  const targetSpeed=old.blood>0
    ? clamp(old.targetSpeed+lever*5.8*step,0,14)
    : 0;
  const launched=old.launched || targetSpeed>0.06;
  if(!launched) {
    return {...old,heading,targetAltitude,throttle:0,targetSpeed:0};
  }

  const seconds=old.seconds+step;
  const wind=stage2Wind({...old,seconds});
  const headingRad=heading*Math.PI/180;
  const windRad=wind.bearing*Math.PI/180;
  const gust=(wind.strength/4)*0.26*(1+0.22*Math.sin(seconds*1.3));
  let vx=old.vx,vy=old.vy;
  if(old.blood>0) {
    // Smooth acceleration and braking, never a discontinuous STOP on release.
    const desiredX=Math.sin(headingRad)*targetSpeed+Math.sin(windRad)*gust;
    const desiredY=Math.cos(headingRad)*targetSpeed+Math.cos(windRad)*gust;
    const differenceX=desiredX-vx,differenceY=desiredY-vy;
    const length=Math.hypot(differenceX,differenceY);
    const adjustment=Math.min(length,
      (targetSpeed>Math.hypot(vx,vy)?3.2:2.5)*step);
    if(length>0.00001) {
      vx+=differenceX/length*adjustment;
      vy+=differenceY/length*adjustment;
    }
  } else {
    // Blood depletion removes sustained drive, but momentum remains.
    const drag=Math.max(0,1-0.095*step);
    vx=vx*drag+Math.sin(windRad)*gust*step;
    vy=vy*drag+Math.cos(windRad)*gust*step;
  }

  const wave=Math.sin(seconds*2.9+old.x*0.033)*0.12;
  const heightDifference=targetAltitude-old.altitude;
  const verticalAcceleration=old.blood>0
    ? clamp(heightDifference*1.65-old.verticalSpeed*1.9+wave*.1,-3.0,3.0)
    : -1.50-old.verticalSpeed*0.10;
  const verticalSpeed=clamp(old.verticalSpeed+verticalAcceleration*step,-3.6,2.8);
  const altitude=old.altitude+verticalSpeed*step;
  const up= Math.max(0,verticalSpeed);
  const down= Math.max(0,-verticalSpeed);

  const cruiseRate=0.0019+0.0125*Math.pow(targetSpeed/14,1.50);
  const climbRate=up*0.0105+down*0.0030;
  const changeRate=Math.abs(targetAltitudeChange)/Math.max(step,0.0001)*0.0025;
  const useRate=cruiseRate+climbRate+changeRate;
  const blood=Math.max(0,old.blood-useRate*step);
  const throttle=targetSpeed/14;
  const next:Stage2Nav={
    ...old,x:old.x+vx*step,y:old.y+vy*step,vx,vy,
    heading,pitch:clamp(old.pitch*0.90+sy*1.5,-10,10),
    altitude,verticalSpeed,blood,throttle,
    targetAltitude,targetSpeed,seconds,launched,
  };
  return resolveContact(next,people);
}
export function stage2OutcomeText(outcome:Stage2End):string {
  switch(outcome){
    case "NOSE":return "STAGE 2 CLEAR · NASAL ENTRY";
    case "MOUTH":return "STAGE 2 CLEAR · ORAL ENTRY";
    case "SEA":return "BLOOD DEPLETED · SANK AT SEA";
    case "SAND":return "BEACH IMPACT · BURIED IN SAND";
    case "REEF":return "ROCK / REEF COLLISION";
    case "TOO_FAST":return "ENTRY SPEED TOO HIGH";
    default:return "MISSED THE SHORE · PASSED BY";
  }
}
