
import { wrap01 } from "./reentryLaunchInput";

import { runStage1Launch } from "./reentryLaunchPipeline";

import type { ReentryOutcome } from "./reentryTypes";



const DIRECTION_HALF_WINDOW_DEG = 10;

const DIRECTION_STEP_DEG = 0.5;



export const NEARBY_SEEDS = [

  1,

  7,

  19,

] as const;



export type NearbySample = {

  powerNorm: number;

  angleNorm: number;

};



export type NearbySuccessStats = {

  reached: number;

  entered: number;

  attempted: number;

  percent: number;

};



export function shouldShowNearbySuccess(

  outcome: ReentryOutcome | null | undefined,

): boolean {

  return (

    outcome === "BURN" ||

    outcome === "BREAK" ||

    outcome === "SKIP"

  );

}



function directionOffsetsDeg(): number[] {

  const values: number[] = [];



  for (

    let deg =

      -DIRECTION_HALF_WINDOW_DEG;

    deg <=

      DIRECTION_HALF_WINDOW_DEG +

        1e-9;

    deg +=

      DIRECTION_STEP_DEG

  ) {

    values.push(

      Number(

        deg.toFixed(3),

      ),

    );

  }



  return values;

}



export function nearbyInputGrid(

  powerNorm: number,

  angleNorm: number,

): NearbySample[] {

  const power =

    Math.min(

      1,

      Math.max(0, powerNorm),

    );



  return directionOffsetsDeg().map(

    (deg) => ({

      powerNorm: power,

      angleNorm:

        wrap01(

          angleNorm +

            deg / 360,

        ),

    }),

  );

}



export function nearbyJobs(

  powerNorm: number,

  angleNorm: number,

): Array<

  NearbySample & {

    seed: number;

  }

> {

  const jobs: Array<

    NearbySample & {

      seed: number;

    }

  > = [];



  for (

    const sample of

    nearbyInputGrid(

      powerNorm,

      angleNorm,

    )

  ) {

    for (

      const seed of

      NEARBY_SEEDS

    ) {

      jobs.push({

        ...sample,

        seed,

      });

    }

  }



  return jobs;

}



export function evaluateNearbyJob(

  job:

    NearbySample & {

      seed: number;

    },

  earthBearingScreenRad?: number,

  spaceStartAltitudeM?: number,

): {

  entered: boolean;

  reached: boolean;

} {

  const launched =

    runStage1Launch(

      job.powerNorm,

      job.angleNorm,

      job.seed,

      earthBearingScreenRad,

      spaceStartAltitudeM,

    );



  const entered =

    launched.space.kind ===

      "ATMOSPHERE_ENTRY";



  return {

    entered,

    reached:

      entered &&

      launched.result.outcome ===

        "EARTH_REACHED",

  };

}



export function nearbySuccessStats(

  reached: number,

  entered: number,

  attempted: number,

): NearbySuccessStats {

  if (entered <= 0) {

    return {

      reached,

      entered: 0,

      attempted,

      percent: 0,

    };

  }



  return {

    reached,

    entered,

    attempted,

    percent:

      Math.round(

        (reached / entered) *

          100,

      ),

  };

}



export function evaluateNearbySuccessSync(

  powerNorm: number,

  angleNorm: number,

  earthBearingScreenRad?: number,

  spaceStartAltitudeM?: number,

): NearbySuccessStats {

  const jobs =

    nearbyJobs(

      powerNorm,

      angleNorm,

    );



  let reached = 0;

  let entered = 0;



  for (

    const job of jobs

  ) {

    const evaluated =

      evaluateNearbyJob(

        job,

        earthBearingScreenRad,

        spaceStartAltitudeM,

      );



    if (evaluated.entered) {

      entered += 1;

    }



    if (evaluated.reached) {

      reached += 1;

    }

  }



  return nearbySuccessStats(

    reached,

    entered,

    jobs.length,

  );

}
