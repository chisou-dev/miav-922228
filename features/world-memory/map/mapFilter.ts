import {
  getWorkById,
  listEnabledWorkIds,
  type TraceCategory,
} from "@/features/world-memory/trace/works";

/** Deep-link ?work= — initial map filter + one-time form preselection. */
export function resolveInitialMapFilter(initialWorkQuery: string | null | undefined): {
  workIds: string[];
  formWorkId: string | null;
} {
  const all = listEnabledWorkIds();
  const raw = initialWorkQuery?.trim();
  if (!raw) return { workIds: all, formWorkId: null };
  const work = getWorkById(raw);
  if (!work?.enabled) return { workIds: all, formWorkId: null };
  return { workIds: [work.id], formWorkId: work.id };
}

/** Intersect work selection with active categories. */
export function effectiveWorkIds(
  categories: readonly TraceCategory[],
  selectedWorkIds: readonly string[],
): string[] {
  return selectedWorkIds.filter((id) => {
    const work = getWorkById(id);
    return work && categories.includes(work.category);
  });
}
