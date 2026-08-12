"use client";

import { useT } from "@/features/shared/i18n";
import { workMarkerStyle } from "@/features/world-memory/map/workColors";
import {
  CATEGORY_ORDER,
} from "@/features/world-memory/map/categoryColors";
import {
  listEnabledWorksByCategory,
  type TraceCategory,
} from "@/features/world-memory/trace/works";
import { workLabelForId } from "@/features/world-memory/my-miav/myMiavPublic";

type Props = {
  selectedCategories: TraceCategory[];
  selectedWorkIds: string[];
  onChange: (next: string[]) => void;
};

const CATEGORY_LABEL_KEY = {
  read: "world.category.read",
  play: "world.category.play",
  apps: "world.category.apps",
} as const;

/**
 * Multi-select Work filter — grouped by category, compact chips.
 * Works in deselected categories appear disabled (category filter wins).
 */
export function WorkFilter({
  selectedCategories,
  selectedWorkIds,
  onChange,
}: Props) {
  const t = useT();

  function toggle(workId: string, category: TraceCategory) {
    if (!selectedCategories.includes(category)) return;
    if (selectedWorkIds.includes(workId)) {
      onChange(selectedWorkIds.filter((id) => id !== workId));
      return;
    }
    onChange([...selectedWorkIds, workId]);
  }

  return (
    <div className="space-y-2">
      <p className="sr-only">{t("world.filterWorksAria")}</p>
      {CATEGORY_ORDER.map((category) => {
        const works = listEnabledWorksByCategory(category);
        if (works.length === 0) return null;
        const categoryOn = selectedCategories.includes(category);
        return (
          <div key={category} className="flex flex-wrap items-center gap-1.5">
            <span
              className={`shrink-0 text-[0.62rem] tracking-[0.14em] uppercase ${
                categoryOn
                  ? "text-[var(--map-ink)]"
                  : "text-[var(--map-muted)] opacity-60"
              }`}
            >
              {t(CATEGORY_LABEL_KEY[category])}
            </span>
            <div
              role="group"
              aria-label={t("world.filterWorksGroupAria", {
                category: t(CATEGORY_LABEL_KEY[category]),
              })}
              className="flex flex-wrap gap-1.5"
            >
              {works.map((work) => {
                const on =
                  categoryOn && selectedWorkIds.includes(work.id);
                const color = workMarkerStyle(work.id);
                const label = workLabelForId(work.id);
                return (
                  <button
                    key={work.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={t("world.filterWorkToggleAria", {
                      work: label,
                      state: on ? t("world.filterOn") : t("world.filterOff"),
                    })}
                    disabled={!categoryOn}
                    onClick={() => toggle(work.id, category)}
                    className={`inline-flex min-h-[34px] max-w-full items-center gap-1.5 border px-2 py-1 text-[0.65rem] tracking-[0.06em] ${
                      !categoryOn
                        ? "cursor-not-allowed border-[var(--map-line)] bg-[var(--map-panel-muted)] text-[var(--map-muted)] opacity-50"
                        : on
                          ? "border-[#6b879c] bg-[#dfe8f0] font-medium text-[var(--map-ink)]"
                          : "border-[var(--map-line)] bg-[var(--map-panel)] text-[var(--map-muted)]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 shrink-0"
                      style={{
                        clipPath:
                          "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                        backgroundColor: categoryOn ? color.fill : "#c5ced6",
                      }}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
