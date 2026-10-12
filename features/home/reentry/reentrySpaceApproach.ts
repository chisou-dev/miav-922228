
import { wrap01 } from "./reentryLaunchInput";



export const SPACE_EARTH_RADIUS_M = 6_371_000;



export const ATMOSPHERE_HANDOFF_ALTITUDE_M = 120_000;

export const SPACE_START_ALTITUDE_M = 60_000_000;



const MIN_SCREEN_MATCHED_START_ALTITUDE_M = 30_000_000;

const MAX_SCREEN_MATCHED_START_ALTITUDE_M = 95_000_000;



export type Vec2 = { x: number; y: number };



export type SpaceState = {

  position: Vec2;

  velocity: Vec2;

  elapsedS: number;

};



export type SpaceApproachPoint = {

  state: SpaceState;

  altitudeM: number;

  screenHeadingRad: number;

};



export type SpaceEntry = {

  speedMps: number;

  gammaRad: number;

  state: SpaceState;

};



export type SpaceApproachResult =

  | {

      kind: "ATMOSPHERE_ENTRY";

      points: SpaceApproachPoint[];

      entry: SpaceEntry;

      startAltitudeM: number;

    }

  | {

      kind: "SPACE_MISS";

      points: SpaceApproachPoint[];

      startAltitudeM: number;

    };



function signedAngleRad(value: number): number {

  let angle = value;

  while (angle > Math.PI) angle -= Math.PI * 2;

  while (angle < -Math.PI) angle += Math.PI * 2;

  return angle;

}



function clamp(value: number, min: number, max: number): number {

  return Math.min(max, Math.max(min, value));

}



function length(v: Vec2): number {

  return Math.hypot(v.x, v.y);

}



function normalize(v: Vec2): Vec2 {

  const l = Math.max(1e-9, length(v));

  return { x: v.x / l, y: v.y / l };

}



export function screenMatchedStartAltitudeM(

  screenEarthRadiusPx: number,

  screenCenterDistancePx: number,

): number {

  const radiusPx = Math.max(1, screenEarthRadiusPx);

  const distancePx = Math.max(radiusPx * 1.05, screenCenterDistancePx);

  const physicalCenterDistanceM =

    SPACE_EARTH_RADIUS_M * (distancePx / radiusPx);



  return clamp(

    physicalCenterDistanceM - SPACE_EARTH_RADIUS_M,

    MIN_SCREEN_MATCHED_START_ALTITUDE_M,

    MAX_SCREEN_MATCHED_START_ALTITUDE_M,

  );

}



function linearStep(

  state: SpaceState,

  dt: number,

): SpaceState {

  return {

    position: {

      x: state.position.x + state.velocity.x * dt,

      y: state.position.y + state.velocity.y * dt,

    },

    velocity: {

      x: state.velocity.x,

      y: state.velocity.y,

    },

    elapsedS: state.elapsedS + dt,

  };

}



function altitudeM(state: SpaceState): number {

  return length(state.position) - SPACE_EARTH_RADIUS_M;

}



function radialVelocity(state: SpaceState): number {

  const er = normalize(state.position);

  return state.velocity.x * er.x + state.velocity.y * er.y;

}



function gammaRad(state: SpaceState): number {

  const er = normalize(state.position);

  const et = { x: -er.y, y: er.x };



  const vr =

    state.velocity.x * er.x +

    state.velocity.y * er.y;



  const vt =

    state.velocity.x * et.x +

    state.velocity.y * et.y;



  return Math.atan2(vr, Math.abs(vt));

}



export function canvasHeadingFromWorld(

  velocity: Vec2,

): number {

  return Math.atan2(-velocity.y, velocity.x);

}



export function directionNormToScreenHeadingRad(

  directionNorm: number,

): number {

  const n = ((directionNorm % 1) + 1) % 1;

  return -Math.PI / 2 + n * Math.PI * 2;

}



export function makeInitialSpaceState(

  speedMps: number,

  headingWorldRad: number,

  startRadialAngleRad: number,

  startAltitudeM = SPACE_START_ALTITUDE_M,

): SpaceState {

  const r =

    SPACE_EARTH_RADIUS_M +

    startAltitudeM;



  return {

    position: {

      x:

        Math.cos(startRadialAngleRad) *

        r,

      y:

        Math.sin(startRadialAngleRad) *

        r,

    },

    velocity: {

      x:

        Math.cos(headingWorldRad) *

        speedMps,

      y:

        Math.sin(headingWorldRad) *

        speedMps,

    },

    elapsedS: 0,

  };

}



/**

 * v21 SPACE rule:

 *

 * Once the player presses LAUNCH the heading is final.

 * SPACE does not steer toward Earth and does not bend the path.

 *

 * This is intentionally a game rule rather than an orbital simulator.

 * Physics v1.1 still begins only after an actual atmospheric intersection.

 */

export function simulateSpaceApproach(

  initial: SpaceState,

): SpaceApproachResult {

  const points: SpaceApproachPoint[] = [];



  let state = initial;

  const startAltitudeM =

    altitudeM(initial);



  const fixedHeading =

    canvasHeadingFromWorld(

      initial.velocity,

    );



  let minimumAltitudeM =

    startAltitudeM;



  const dt = 2;

  const maxSteps =

    Math.floor(

      (6 * 60 * 60) / dt,

    );



  const pushPoint = () => {

    points.push({

      state,

      altitudeM:

        altitudeM(state),

      screenHeadingRad:

        fixedHeading,

    });

  };



  pushPoint();



  for (

    let i = 0;

    i < maxSteps;

    i++

  ) {

    state =

      linearStep(

        state,

        dt,

      );



    const alt =

      altitudeM(state);



    minimumAltitudeM =

      Math.min(

        minimumAltitudeM,

        alt,

      );



    if (

      i % 2 === 0 ||

      alt <=

        ATMOSPHERE_HANDOFF_ALTITUDE_M +

          180_000

    ) {

      pushPoint();

    }



    if (

      alt <=

        ATMOSPHERE_HANDOFF_ALTITUDE_M &&

      radialVelocity(state) < 0

    ) {

      return {

        kind:

          "ATMOSPHERE_ENTRY",

        points,

        entry: {

          speedMps:

            length(

              state.velocity,

            ),

          gammaRad:

            gammaRad(state),

          state,

        },

        startAltitudeM,

      };

    }



    const outbound =

      radialVelocity(state) > 0;



    const clearlyDeparted =

      outbound &&

      alt >

        Math.max(

          startAltitudeM +

            6_000_000,

          minimumAltitudeM +

            12_000_000,

        );



    /*

     * If the player aimed away from Earth, do not wait hours before

     * classifying the run as a miss. Still keep enough straight-line points

     * for the visible departure animation.

     */

    const aimedAwayAndGone =

      minimumAltitudeM >

        startAltitudeM -

          250_000 &&

      alt >

        startAltitudeM +

          8_000_000 &&

      state.elapsedS >

        180;



    if (

      clearlyDeparted ||

      aimedAwayAndGone

    ) {

      pushPoint();



      return {

        kind: "SPACE_MISS",

        points,

        startAltitudeM,

      };

    }



    if (!Number.isFinite(alt)) {

      break;

    }

  }



  pushPoint();



  return {

    kind: "SPACE_MISS",

    points,

    startAltitudeM,

  };

}



export function launchSpaceApproach(

  speedMps: number,

  directionNorm: number,

  earthBearingScreenRad?: number,

  startAltitudeM =

    SPACE_START_ALTITUDE_M,

): SpaceApproachResult {

  const screenHeading =

    directionNormToScreenHeadingRad(

      wrap01(directionNorm),

    );



  const startRadial =

    Math.PI / 4;



  let worldHeading: number;



  if (

    earthBearingScreenRad !==

      undefined &&

    Number.isFinite(

      earthBearingScreenRad,

    )

  ) {

    const screenOffset =

      signedAngleRad(

        screenHeading -

          earthBearingScreenRad,

      );



    const inwardWorldHeading =

      startRadial +

      Math.PI;



    worldHeading =

      inwardWorldHeading -

      screenOffset;

  } else {

    worldHeading =

      -screenHeading;

  }



  return simulateSpaceApproach(

    makeInitialSpaceState(

      speedMps,

      worldHeading,

      startRadial,

      startAltitudeM,

    ),

  );

}



export function sampleSpacePoint(

  points: SpaceApproachPoint[],

  t: number,

): SpaceApproachPoint | null {

  if (points.length === 0) {

    return null;

  }



  const scaled =

    Math.min(

      1,

      Math.max(0, t),

    ) *

    (points.length - 1);



  const i =

    Math.min(

      points.length - 2,

      Math.floor(scaled),

    );



  const u =

    points.length === 1

      ? 0

      : scaled - i;



  const a =

    points[

      Math.max(0, i)

    ];



  const b =

    points[

      Math.min(

        points.length - 1,

        i + 1,

      )

    ];



  const state: SpaceState = {

    position: {

      x:

        a.state.position.x +

        (

          b.state.position.x -

          a.state.position.x

        ) *

          u,

      y:

        a.state.position.y +

        (

          b.state.position.y -

          a.state.position.y

        ) *

          u,

    },

    velocity: {

      x:

        a.state.velocity.x,

      y:

        a.state.velocity.y,

    },

    elapsedS:

      a.state.elapsedS +

      (

        b.state.elapsedS -

        a.state.elapsedS

      ) *

        u,

  };



  return {

    state,

    altitudeM:

      a.altitudeM +

      (

        b.altitudeM -

        a.altitudeM

      ) *

        u,

    screenHeadingRad:

      a.screenHeadingRad,

  };

}



export function sampleSpacePointByElapsed01(

  points: SpaceApproachPoint[],

  t: number,

): SpaceApproachPoint | null {

  if (points.length === 0) {

    return null;

  }

  if (points.length === 1) {

    return points[0];

  }

  const clamped =

    Math.min(

      1,

      Math.max(0, t),

    );

  const firstElapsed =

    points[0].state.elapsedS;

  const lastElapsed =

    points[points.length - 1]

      .state.elapsedS;

  const targetElapsed =

    firstElapsed +

    (

      lastElapsed -

      firstElapsed

    ) *

      clamped;

  let lo = 0;

  let hi =

    points.length - 1;

  while (lo + 1 < hi) {

    const mid =

      Math.floor(

        (lo + hi) / 2,

      );

    if (

      points[mid].state.elapsedS <=

      targetElapsed

    ) {

      lo = mid;

    } else {

      hi = mid;

    }

  }

  const a =

    points[lo];

  const b =

    points[hi];

  const elapsedSpan =

    Math.max(

      1e-9,

      b.state.elapsedS -

        a.state.elapsedS,

    );

  const u =

    Math.min(

      1,

      Math.max(

        0,

        (

          targetElapsed -

          a.state.elapsedS

        ) /

          elapsedSpan,

      ),

    );

  return {

    state: {

      position: {

        x:

          a.state.position.x +

          (

            b.state.position.x -

            a.state.position.x

          ) *

            u,

        y:

          a.state.position.y +

          (

            b.state.position.y -

            a.state.position.y

          ) *

            u,

      },

      velocity: {

        x:

          a.state.velocity.x +

          (

            b.state.velocity.x -

            a.state.velocity.x

          ) *

            u,

        y:

          a.state.velocity.y +

          (

            b.state.velocity.y -

            a.state.velocity.y

          ) *

            u,

      },

      elapsedS:

        a.state.elapsedS +

        (

          b.state.elapsedS -

          a.state.elapsedS

        ) *

          u,

    },

    altitudeM:

      a.altitudeM +

      (

        b.altitudeM -

        a.altitudeM

      ) *

        u,

    screenHeadingRad:

      a.screenHeadingRad +

      (

        b.screenHeadingRad -

        a.screenHeadingRad

      ) *

        u,

  };

}



export function maxHeadingJumpDeg(

  points: SpaceApproachPoint[],

): number {

  let maxJump = 0;



  for (

    let i = 1;

    i < points.length;

    i++

  ) {

    let d =

      points[i].screenHeadingRad -

      points[i - 1]

        .screenHeadingRad;



    while (d > Math.PI) {

      d -= Math.PI * 2;

    }



    while (d < -Math.PI) {

      d += Math.PI * 2;

    }



    maxJump =

      Math.max(

        maxJump,

        Math.abs(

          (d * 180) /

            Math.PI,

        ),

      );

  }



  return maxJump;

}



export function headingDeltaDeg(

  fromRad: number,

  toRad: number,

): number {

  let d =

    toRad -

    fromRad;



  while (d > Math.PI) {

    d -= Math.PI * 2;

  }



  while (d < -Math.PI) {

    d += Math.PI * 2;

  }



  return Math.abs(

    (d * 180) /

      Math.PI,

  );

}



export { radialVelocity };
