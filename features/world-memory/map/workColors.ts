/**
 * Work-level map star colors and offsets — sourced from works.ts definitions.
 */

import { CATEGORY_MAP_COLORS } from "@/features/world-memory/map/categoryColors";
import { getWorkById } from "@/features/world-memory/trace/works";

export function workMarkerStyle(workId: string): {
  fill: string;
  border: string;
} {
  const work = getWorkById(workId);
  if (work?.markerColor) {
    return {
      fill: work.markerColor,
      border: work.markerBorder ?? "rgba(36, 52, 71, 0.45)",
    };
  }
  if (work) {
    return CATEGORY_MAP_COLORS[work.category];
  }
  return { fill: "#6b7c8d", border: "rgba(36, 52, 71, 0.45)" };
}

/** Compact circular offsets for work stars within one geography group. */
export function workMarkerOffsets(
  workIds: readonly string[],
): Map<string, { x: number; y: number }> {
  const sorted = [...workIds].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, { x: number; y: number }>();
  const n = sorted.length;
  if (n === 0) return map;
  if (n === 1) {
    map.set(sorted[0]!, { x: 0, y: 0 });
    return map;
  }
  const radius = n <= 3 ? 8 : 9;
  sorted.forEach((id, index) => {
    const angle = (2 * Math.PI * index) / n - Math.PI / 2;
    map.set(id, {
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    });
  });
  return map;
}

/** Collect distinct workIds present on a geography aggregate. */
export function workIdsFromGeography(
  categories: { works: { workId: string }[] }[],
): string[] {
  const ids = new Set<string>();
  for (const cat of categories) {
    for (const work of cat.works) {
      ids.add(work.workId);
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}
