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
  x: number; y: number; label: string;
};
export type Stage2Nav = {
  x: number; y: number; vx: number; vy: number; heading: number;
  pitch: number; altitude: number; verticalSpeed: number;
  fuel: number; throttle: number; seconds: number; launched: boolean;
  outcome: Stage2End | null; destination: Stage2IslandId | null;
};
export type Stage2Input = { left: boolean; right: boolean; up: boolean; down: boolean; thrust: number };
export type Stage2Wind = { bearing: number; strength: number; arrow: string };
export const STAGE2_ISLANDS: readonly Stage2Island[] = [
  { id:"japan",bearing:35,radius:32,x:Math.sin(35*Math.PI/180)*350,y:Math.cos(35*Math.PI/180)*350,label:"JAPAN" },
  { id:"antarctic",bearing:151,radius:35,x:Math.sin(151*Math.PI/180)*410,y:Math.cos(151*Math.PI/180)*410,label:"POLAR BASE" },
  { id:"visitor",bearing:272,radius:30,x:Math.sin(272*Math.PI/180)*380,y:Math.cos(272*Math.PI/180)*380,label:"REMOTE ISLAND" },
];
export const STAGE2_ZOOMS = [1,2,4,8,16] as const;
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
  return {x:0,y:0,vx:0,vy:0,heading:0,pitch:0,altitude:3.2,
    verticalSpeed:0,fuel:1,throttle:0,seconds:0,launched:false,
    outcome:null,destination:null};
}
function resolveContact(s:Stage2Nav,people:Record<Stage2IslandId,boolean>):Stage2Nav {
  for(const island of STAGE2_ISLANDS){
    const dist=islandDistance(s,island);
    if(dist>island.radius)continue;
    const speed=Math.hypot(s.vx,s.vy);
    // The island itself is terrain. A face is tiny relative to the beach.
    if(dist<4.1 && people[island.id] && s.altitude>1.25 && s.altitude<2.35) {
      const dx=island.x-s.x,dy=island.y-s.y;
      const direction=bearingTo(dx,dy);
      const incidence=Math.abs(signedBearing(direction-s.heading));
      // The face is approached along the axis of travel. The narrow
      // left/right opening is an actual world-space corridor, not a random roll.
      const lateral=signedBearing(s.heading-island.bearing)*0.065;
      if(incidence<13 && speed>=2.4 && speed<=10.8){
        if(Math.abs(lateral+0.44)<0.37&&s.altitude<1.79)
          return {...s,outcome:"NOSE",destination:island.id};
        if(Math.abs(lateral-0.34)<0.49&&s.altitude>=1.79)
          return {...s,outcome:"MOUTH",destination:island.id};
      }
      if(speed>10.8)return {...s,outcome:"TOO_FAST",destination:island.id};
    }
    if(s.altitude<=0.65){
      const reef=Math.abs(signedBearing(s.heading-island.bearing))>11;
      return {...s,outcome:reef?"REEF":"SAND",destination:island.id};
    }
    // Entering the sand beyond the narrow human entry corridor is a miss.
    if(dist<2.8)return {...s,outcome:"SAND",destination:island.id};
  }
  if(s.altitude<=0.65)return {...s,outcome:"SEA"};
  if(s.seconds>115)return {...s,outcome:"MISSED"};
  return s;
}
export function stepStage2(
  old:Stage2Nav,input:Stage2Input,dt:number,
  people:Record<Stage2IslandId,boolean>,
):Stage2Nav {
  if(old.outcome)return old;
  const step=clamp(dt,0,0.05);
  const turn=(Number(input.right)-Number(input.left))*54*step;
  const elevate=(Number(input.up)-Number(input.down))*13*step;
  const heading=wrap360(old.heading+turn);
  const pitch=clamp(old.pitch+elevate,-15,15);
  const throttle=clamp(input.thrust,0,1);
  // Scan the 360° horizon for free. Flight starts on the first real thrust.
  const launched=old.launched||throttle>0.02;
  if(!launched)return {...old,heading,pitch,throttle:0};
  const fuel=Math.max(0,old.fuel-(0.004+0.046*throttle*throttle)*step);
  const actual=fuel>0?throttle:0;
  const seconds=old.seconds+step;
  const wind=stage2Wind({...old,seconds});
  const radians=heading*Math.PI/180;
  const gust=(wind.strength/4)*0.42*(1+0.27*Math.sin(seconds*1.3));
  let vx=old.vx+(Math.sin(radians)*(6.2*actual)+
    Math.sin(wind.bearing*Math.PI/180)*gust)*step;
  let vy=old.vy+(Math.cos(radians)*(6.2*actual)+
    Math.cos(wind.bearing*Math.PI/180)*gust)*step;
  const drag=Math.max(0,1-0.06*step);
  vx*=drag;vy*=drag;
  const speed=Math.hypot(vx,vy);
  if(speed>32){vx*=32/speed;vy*=32/speed;}
  const wave=Math.sin(seconds*2.8+old.x*0.035)*0.22;
  const verticalAcc=(actual-0.48)*1.7+pitch*0.08+wave-old.verticalSpeed*0.82;
  const verticalSpeed=clamp(old.verticalSpeed+verticalAcc*step,-2.5,2);
  const altitude=old.altitude+verticalSpeed*step;
  const next:Stage2Nav={...old,x:old.x+vx*step,y:old.y+vy*step,
    vx,vy,heading,pitch,altitude,verticalSpeed,fuel,
    throttle:actual,seconds,launched};
  return resolveContact(next,people);
}
export function stage2OutcomeText(outcome:Stage2End):string {
  switch(outcome){
    case "NOSE":return "STAGE 2 CLEAR · NASAL ENTRY";
    case "MOUTH":return "STAGE 2 CLEAR · ORAL ENTRY";
    case "SEA":return "FUEL / ALTITUDE LOST · SANK AT SEA";
    case "SAND":return "BEACH IMPACT · BURIED IN SAND";
    case "REEF":return "ROCK / REEF COLLISION";
    case "TOO_FAST":return "ENTRY SPEED TOO HIGH";
    default:return "TARGET MISSED";
  }
}
