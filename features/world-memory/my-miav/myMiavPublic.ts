/**
 * Pure My MIAV helpers — no Firestore, safe for fixture tests.
 * Never include uid / internal document ids in public shapes.
 */

import {
  TRACE_CATEGORIES,
  getWorkById,
  type TraceCategory,
} from "@/features/world-memory/trace/works";

export type MyMiavActivity = {
  category: TraceCategory;
  workId: string;
  locationId: string | null;
  country: string;
  region: string;
  city: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type MyMiavResponse = {
  miavId: string | null;
  activities: MyMiavActivity[];
};

const PRIVATE_KEYS = [
  "uid",
  "firebaseUid",
  "email",
  "displayName",
  "photoURL",
  "token",
  "activityId",
  "id",
] as const;

export function toPublicMyActivity(input: {
  category: TraceCategory;
  workId: string;
  locationId?: string | null;
  country: string;
  region: string;
  city: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
}): MyMiavActivity {
  return {
    category: input.category,
    workId: input.workId,
    locationId: input.locationId ?? null,
    country: input.country,
    region: input.region,
    city: input.city,
    message: input.message,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt || input.createdAt,
  };
}

/** Newest first. */
export function sortMyActivities(
  activities: MyMiavActivity[],
): MyMiavActivity[] {
  return [...activities].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type MyMiavCategoryGroup = {
  category: TraceCategory;
  activities: MyMiavActivity[];
};

/** Group by category order; empty categories omitted. Within group: newest first. */
export function groupMyActivitiesByCategory(
  activities: MyMiavActivity[],
): MyMiavCategoryGroup[] {
  const sorted = sortMyActivities(activities);
  const groups: MyMiavCategoryGroup[] = [];
  for (const category of TRACE_CATEGORIES) {
    const rows = sorted.filter((a) => a.category === category);
    if (rows.length === 0) continue;
    groups.push({ category, activities: rows });
  }
  return groups;
}

export function workLabelForId(workId: string): string {
  return getWorkById(workId)?.label || workId;
}

/** Deep-scan JSON for private field names (fixture privacy check). */
export function containsPrivateMyMiavFields(value: unknown): boolean {
  const seen = new Set<unknown>();
  function walk(node: unknown): boolean {
    if (node == null || typeof node !== "object") return false;
    if (seen.has(node)) return false;
    seen.add(node);
    if (Array.isArray(node)) return node.some(walk);
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if ((PRIVATE_KEYS as readonly string[]).includes(key)) return true;
      if (walk(child)) return true;
    }
    return false;
  }
  return walk(value);
}

/**
 * Merge owner activities; never include guest / other-uid rows.
 * `ownerRows` must already be scoped to the authenticated uid server-side.
 */
export function buildMyMiavResponse(input: {
  miavId: string | null;
  activities: MyMiavActivity[];
}): MyMiavResponse {
  return {
    miavId: input.miavId,
    activities: sortMyActivities(input.activities),
  };
}
