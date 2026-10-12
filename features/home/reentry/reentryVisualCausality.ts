
export type Vec2 = { x: number; y: number };



function clamp01(value: number): number {

  return Math.min(1, Math.max(0, value));

}



export function smoothstep01(value: number): number {

  const t = clamp01(value);

  return t * t * (3 - 2 * t);

}



export function mixNum(a: number, b: number, t: number): number {

  return a + (b - a) * t;

}



function length(v: Vec2): number {

  return Math.hypot(v.x, v.y);

}



function normalized(v: Vec2): Vec2 {

  const len = Math.max(1e-9, length(v));

  return {

    x: v.x / len,

    y: v.y / len,

  };

}



/**

 * v22 visual SPACE pose.

 *

 * The player picked `launchHeading`; therefore both the craft nose and the

 * craft path use exactly that heading on screen.

 *

 * Physical SPACE remains straight in v21/v22. We only use the physical

 * travelled distance to decide how far along the selected screen ray the

 * craft has moved.

 *

 * This removes the last small left/up offset caused by converting the world

 * basis back through the previous similarity/reflection transform.

 */

export function straightSpaceScreenPose({

  currentPosition,

  initialPosition,

  worldEarthDistance,

  screenEarthDistance,

  launchPoint,

  launchHeading,

}: {

  currentPosition: Vec2;

  initialPosition: Vec2;

  worldEarthDistance: number;

  screenEarthDistance: number;

  launchPoint: Vec2;

  launchHeading: number;

}): {

  x: number;

  y: number;

  angle: number;

} {

  const travelledM =

    Math.hypot(

      currentPosition.x - initialPosition.x,

      currentPosition.y - initialPosition.y,

    );



  const pxPerM =

    screenEarthDistance /

    Math.max(1, worldEarthDistance);



  const travelledPx =

    travelledM * pxPerM;



  return {

    x:

      launchPoint.x +

      Math.cos(launchHeading) *

        travelledPx,

    y:

      launchPoint.y +

      Math.sin(launchHeading) *

        travelledPx,

    angle:

      launchHeading,

  };

}



/**

 * Legacy similarity transform kept for old dev/verifier callers.

 * Stage 1 presentation must use `straightSpaceScreenPose()` in v22.

 */

export function similaritySpacePose({

  currentPosition,

  currentVelocity,

  initialPosition,

  earthCenter,

  launchPoint,

  cameraEarthCenter,

  cameraScale = 1,

}: {

  currentPosition: Vec2;

  currentVelocity: Vec2;

  initialPosition: Vec2;

  earthCenter: Vec2;

  launchPoint: Vec2;

  cameraEarthCenter?: Vec2;

  cameraScale?: number;

}): { x: number; y: number; angle: number } {

  const worldRadial = normalized(initialPosition);

  const worldTangential = {

    x: -worldRadial.y,

    y: worldRadial.x,

  };



  const screenStartVector = {

    x: launchPoint.x - earthCenter.x,

    y: launchPoint.y - earthCenter.y,

  };



  const screenDistance =

    Math.max(1, length(screenStartVector));



  const worldDistance =

    Math.max(1, length(initialPosition));



  const scale =

    screenDistance / worldDistance;



  const screenRadial =

    normalized(screenStartVector);



  const screenTangential = {

    x: screenRadial.y,

    y: -screenRadial.x,

  };



  const dot = (

    a: Vec2,

    b: Vec2,

  ) => a.x * b.x + a.y * b.y;



  const radialM =

    dot(currentPosition, worldRadial);



  const tangentialM =

    dot(currentPosition, worldTangential);



  const baseX =

    earthCenter.x +

    (

      screenRadial.x * radialM +

      screenTangential.x * tangentialM

    ) *

      scale;



  const baseY =

    earthCenter.y +

    (

      screenRadial.y * radialM +

      screenTangential.y * tangentialM

    ) *

      scale;



  const radialV =

    dot(currentVelocity, worldRadial);



  const tangentialV =

    dot(currentVelocity, worldTangential);



  const screenVx =

    (

      screenRadial.x * radialV +

      screenTangential.x * tangentialV

    ) *

    scale;



  const screenVy =

    (

      screenRadial.y * radialV +

      screenTangential.y * tangentialV

    ) *

    scale;



  const viewCenter =

    cameraEarthCenter ?? earthCenter;



  const zoom =

    Math.max(0.01, cameraScale);



  return {

    x:

      viewCenter.x +

      (baseX - earthCenter.x) *

        zoom,

    y:

      viewCenter.y +

      (baseY - earthCenter.y) *

        zoom,

    angle:

      Math.atan2(screenVy, screenVx),

  };

}



export function atmosphereThicknessPx(

  earthR: number,

): number {

  return Math.max(

    2.5,

    Math.min(

      18,

      earthR * 0.0205,

    ),

  );

}



export function signedDistanceToAtmospherePx(

  craftX: number,

  craftY: number,

  earthX: number,

  earthY: number,

  earthR: number,

  thicknessPx: number,

): number {

  return (

    Math.hypot(

      craftX - earthX,

      craftY - earthY,

    ) -

    (earthR + thicknessPx)

  );

}



export function clampHeadingJump(

  from: number,

  to: number,

  maxDeg = 8,

): number {

  let delta = to - from;



  while (delta > Math.PI) {

    delta -= Math.PI * 2;

  }



  while (delta < -Math.PI) {

    delta += Math.PI * 2;

  }



  const max =

    (maxDeg * Math.PI) / 180;



  if (delta > max) delta = max;

  if (delta < -max) delta = -max;



  return from + delta;

}



export function closestApproachIndex(

  points: { altitudeM: number }[],

): number {

  let best = 0;



  for (

    let i = 1;

    i < points.length;

    i++

  ) {

    if (

      points[i].altitudeM <

      points[best].altitudeM

    ) {

      best = i;

    }

  }



  return best;

}




export function missPlaybackToPathT(

  spaceT: number,

  periIndex: number,

  pointCount: number,

): number {

  const t = clamp01(spaceT);

  /*
   * Miss playback is one continuous ease-out curve.
   *
   * The old piecewise curve changed slope around closest approach and,
   * combined with denser stored points near Earth, looked like a sudden
   * slowdown followed by an acceleration. Misses are now sampled by elapsed
   * physical time, so this value is a smooth time fraction.
   */

  void periIndex;

  void pointCount;

  /*
   * Use the physical elapsed-time fraction directly.
   * This removes the remaining visual acceleration/deceleration around the
   * flyby. The tiny gravity curve below supplies the only departure change.
   */

  return t;

}



export function gravitationalFlybyScreenPose({

  pose,

  launchPoint,

  earthCenter,

  launchHeading,

  spaceT,

}: {

  pose: {

    x: number;

    y: number;

    angle: number;

  };

  launchPoint: Vec2;

  earthCenter: Vec2;

  launchHeading: number;

  spaceT: number;

}): {

  x: number;

  y: number;

  angle: number;

} {

  /*
   * Presentation-only gravitational assist.
   *
   * The player's launch heading is untouched on the inbound leg. After the
   * spacecraft has passed Earth, its outbound track bends only a few degrees
   * toward Earth, as a distant hyperbolic flyby would appear from this
   * camera. This does not change hit/miss classification or reentry physics.
   */

  const bend =

    smoothstep01(

      (

        clamp01(spaceT) -

        0.50

      ) /

        0.50,

    );

  if (bend <= 0) {

    return pose;

  }

  const dx =

    earthCenter.x -

    launchPoint.x;

  const dy =

    earthCenter.y -

    launchPoint.y;

  const dirX =

    Math.cos(

      launchHeading,

    );

  const dirY =

    Math.sin(

      launchHeading,

    );

  const normalX =

    -dirY;

  const normalY =

    dirX;

  const towardEarthSide =

    Math.sign(

      dirX * dy -

      dirY * dx,

    ) || 1;

  const earthDistancePx =

    Math.max(

      1,

      Math.hypot(

        dx,

        dy,

      ),

    );

  const lateralPx =

    earthDistancePx *

    0.025 *

    bend;

  const maxTurnRad =

    (2.25 * Math.PI) /

    180;

  return {

    x:

      pose.x +

      normalX *

        towardEarthSide *

        lateralPx,

    y:

      pose.y +

      normalY *

        towardEarthSide *

        lateralPx,

    angle:

      launchHeading +

      towardEarthSide *

        maxTurnRad *

        bend,

  };

}




export function elapsedSincePlaybackS(

  playback: number,

  startPlayback: number,

  spaceShare: number,

  inboundMs: number,

): number {

  if (

    startPlayback >= 0.999 ||

    playback <= startPlayback

  ) {

    return 0;

  }



  const totalMs =

    inboundMs /

    Math.max(1e-4, spaceShare);



  return (

    ((playback - startPlayback) *

      totalMs) /

    1000

  );

}

export function spaceApproach01(
  altitudeM: number,
  handoffM: number,
  startM: number,
): number {
  return clamp01(1 - (altitudeM - handoffM) / (startM - handoffM));
}


export function spaceTravelT(

  spaceT: number,

  powerNorm: number,

  miss: boolean,

): number {

  const t = clamp01(spaceT);

  const p = clamp01(powerNorm);



  const exponent =

    miss

      ? mixNum(1.45, 1.90, p)

      : mixNum(1.55, 2.25, p);



  return 1 - Math.pow(1 - t, exponent);

}

