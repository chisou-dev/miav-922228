import "server-only";

import { getMiavIdentity } from "@/features/world-memory/trace/identityRest";
import { getActivityByUidWork } from "@/features/world-memory/trace/activityRest";
import { getTraceByUid } from "@/features/world-memory/trace/traceRest";
import {
  MIAV_WORK_DEFINITIONS,
  isTraceCategory,
} from "@/features/world-memory/trace/works";
import {
  buildMyMiavResponse,
  toPublicMyActivity,
  type MyMiavActivity,
  type MyMiavResponse,
} from "@/features/world-memory/my-miav/myMiavPublic";

/**
 * Read-only My MIAV payload for the authenticated Google uid.
 * Never allocates Identity / never writes Firestore.
 */
export async function getMyMiavForUid(uid: string): Promise<MyMiavResponse> {
  const [identity, legacy] = await Promise.all([
    getMiavIdentity(uid),
    getTraceByUid(uid),
  ]);

  let miavId: string | null = identity?.miavId || null;
  if (
    !miavId &&
    legacy?.authType === "google" &&
    typeof legacy.miavId === "string" &&
    legacy.miavId.startsWith("MIAV-")
  ) {
    miavId = legacy.miavId;
  }

  const activities: MyMiavActivity[] = [];
  const seenWorks = new Set<string>();

  for (const work of MIAV_WORK_DEFINITIONS) {
    const activity = await getActivityByUidWork(uid, work.id);
    if (!activity) continue;
    seenWorks.add(work.id);
    activities.push(
      toPublicMyActivity({
        category: activity.category,
        workId: activity.workId,
        locationId: activity.locationId,
        country: activity.country,
        region: activity.region,
        city: activity.city,
        message: activity.message,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
      }),
    );
  }

  // Legacy Google Trace with category/workId — read-only, no migration write.
  if (
    legacy?.authType === "google" &&
    legacy.workId &&
    legacy.category &&
    isTraceCategory(legacy.category) &&
    !seenWorks.has(legacy.workId)
  ) {
    activities.push(
      toPublicMyActivity({
        category: legacy.category,
        workId: legacy.workId,
        locationId: legacy.locationId,
        country: legacy.country,
        region: legacy.region,
        city: legacy.city,
        message: legacy.message,
        createdAt: legacy.createdAt,
        updatedAt: legacy.updatedAt,
      }),
    );
  }

  // Guest / other auth types never appear (getTraceByUid is this uid only;
  // guest docs use visitorId keys, not Google uid).

  return buildMyMiavResponse({ miavId, activities });
}
