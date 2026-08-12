/**
 * MIAV World category / work catalog for Trace posts.
 * Stable IDs only — never store UI labels in Firestore.
 */

export type TraceCategory = "read" | "play" | "apps";

export type MiavWorkDefinition = {
  id: string;
  category: TraceCategory;
  /** Display label (proper names; not translated). */
  label: string;
  /** When false, hidden from post UI and rejected by POST validation. */
  enabled: boolean;
  /** Map star fill — distinct per work; falls back to category color. */
  markerColor?: string;
  /** Map star border — optional; derived when omitted. */
  markerBorder?: string;
};

export const TRACE_CATEGORIES = ["read", "play", "apps"] as const;

export const MIAV_WORK_DEFINITIONS: readonly MiavWorkDefinition[] = [
  {
    id: "miav-922228",
    category: "read",
    label: "MIAV-922228",
    enabled: true,
    markerColor: "#3d6b8c",
    markerBorder: "rgba(36, 52, 71, 0.45)",
  },
  {
    id: "japan-8000hz",
    category: "read",
    label: "JAPAN 8000Hz",
    enabled: true,
    markerColor: "#2a5570",
    markerBorder: "rgba(30, 45, 60, 0.45)",
  },
  {
    id: "fourth-period",
    category: "read",
    label: "Fourth Period",
    enabled: true,
    /** Quiet dusk mauve — distinct from READ blues, PLAY amber, APPS sage. */
    markerColor: "#6b5678",
    markerBorder: "rgba(50, 40, 58, 0.45)",
  },
  {
    id: "binary-block",
    category: "play",
    label: "Binary Block",
    enabled: true,
    markerColor: "#c4843a",
    markerBorder: "rgba(90, 55, 20, 0.4)",
  },
  {
    id: "luminous-structure",
    category: "play",
    label: "Luminous Structure",
    // Not published / not linked from the site yet — keep for future filters.
    enabled: false,
  },
  {
    id: "writer-memo",
    category: "apps",
    label: "Writer Memo",
    enabled: true,
    markerColor: "#4a7c59",
    markerBorder: "rgba(40, 60, 45, 0.4)",
  },
] as const;

const byId = new Map(
  MIAV_WORK_DEFINITIONS.map((work) => [work.id, work] as const),
);

export function isTraceCategory(value: unknown): value is TraceCategory {
  return value === "read" || value === "play" || value === "apps";
}

export function getWorkById(workId: string): MiavWorkDefinition | undefined {
  return byId.get(workId);
}

export function listWorksByCategory(
  category: TraceCategory,
): MiavWorkDefinition[] {
  return MIAV_WORK_DEFINITIONS.filter((work) => work.category === category);
}

export function listEnabledWorksByCategory(
  category: TraceCategory,
): MiavWorkDefinition[] {
  return listWorksByCategory(category).filter((work) => work.enabled);
}

/** All enabled works across categories (catalog order). */
export function listEnabledWorks(): MiavWorkDefinition[] {
  return MIAV_WORK_DEFINITIONS.filter((work) => work.enabled);
}

export function listEnabledWorkIds(): string[] {
  return listEnabledWorks().map((work) => work.id);
}

/**
 * Parse optional workIds query param against selected categories.
 * Empty param → all enabled works in those categories.
 */
export function parseWorkIdsParam(
  raw: string | null | undefined,
  categories: readonly TraceCategory[],
): string[] | { error: string } {
  const enabledInScope = listEnabledWorks().filter((work) =>
    categories.includes(work.category),
  );

  if (raw == null || raw.trim() === "") {
    return enabledInScope.map((work) => work.id);
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return enabledInScope.map((work) => work.id);
  }

  const out: string[] = [];
  for (const id of parts) {
    const work = getWorkById(id);
    if (!work) {
      return { error: `Unknown workId: ${id}` };
    }
    if (!work.enabled) {
      return { error: `Work is not available: ${id}` };
    }
    if (!categories.includes(work.category)) {
      return {
        error: `workId ${id} is not in the selected categories.`,
      };
    }
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Categories that currently have at least one selectable work. */
export function listPostableCategories(): TraceCategory[] {
  return TRACE_CATEGORIES.filter(
    (category) => listEnabledWorksByCategory(category).length > 0,
  );
}

export type CategoryWorkValidation =
  | { ok: true; category: TraceCategory; workId: string }
  | { ok: false; error: string };

/**
 * Server-side (and shared) validation for Trace POST.
 * Client values are not trusted — always call this on the API.
 */
export function validateCategoryWork(
  categoryRaw: unknown,
  workIdRaw: unknown,
): CategoryWorkValidation {
  if (categoryRaw == null || categoryRaw === "") {
    return { ok: false, error: "category is required." };
  }
  if (typeof categoryRaw !== "string" || !isTraceCategory(categoryRaw)) {
    return { ok: false, error: "Unknown category." };
  }

  if (workIdRaw == null || workIdRaw === "") {
    return { ok: false, error: "workId is required." };
  }
  if (typeof workIdRaw !== "string") {
    return { ok: false, error: "Unknown workId." };
  }

  const workId = workIdRaw.trim();
  if (!workId) {
    return { ok: false, error: "workId is required." };
  }

  const work = getWorkById(workId);
  if (!work) {
    return { ok: false, error: "Unknown workId." };
  }
  if (work.category !== categoryRaw) {
    return {
      ok: false,
      error: "workId does not match the selected category.",
    };
  }
  if (!work.enabled) {
    return { ok: false, error: "This work is not available." };
  }

  return { ok: true, category: categoryRaw, workId: work.id };
}

/** Optional fields on legacy traces — never invent category/workId. */
export function optionalCategoryWork(input: {
  category?: string | null;
  workId?: string | null;
}): { category?: TraceCategory; workId?: string } {
  const category =
    input.category && isTraceCategory(input.category)
      ? input.category
      : undefined;
  const workId =
    typeof input.workId === "string" && input.workId.trim()
      ? input.workId.trim()
      : undefined;
  if (!category || !workId) return {};
  return { category, workId };
}
