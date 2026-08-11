/**
 * Fixed Category colors for MIAV World map.
 * Same mapping everywhere — never change per screen.
 * Color is not the only cue: always pair with READ/PLAY/APPS text.
 */

import type { TraceCategory } from "@/features/world-memory/trace/works";

export const CATEGORY_MAP_COLORS: Record<
  TraceCategory,
  { fill: string; border: string }
> = {
  /** Literary cool ink-blue */
  read: { fill: "#3d6b8c", border: "rgba(36, 52, 71, 0.45)" },
  /** Warm amber — games without neon */
  play: { fill: "#c4843a", border: "rgba(90, 55, 20, 0.4)" },
  /** Soft sage — apps / tools */
  apps: { fill: "#4a7c59", border: "rgba(40, 60, 45, 0.4)" },
};

/** Compact pixel offsets inside one geography marker group (CSS px). */
export const CATEGORY_MARKER_OFFSETS: Record<
  TraceCategory,
  { x: number; y: number }
> = {
  read: { x: 0, y: -7 },
  play: { x: -8, y: 5 },
  apps: { x: 8, y: 5 },
};

export const CATEGORY_ORDER: TraceCategory[] = ["read", "play", "apps"];
