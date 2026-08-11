"use client";

import { useT } from "@/features/shared/i18n";
import {
  CATEGORY_MAP_COLORS,
  CATEGORY_ORDER,
} from "@/features/world-memory/map/categoryColors";
import type { TraceCategory } from "@/features/world-memory/trace/works";

type Props = {
  selected: TraceCategory[];
  onChange: (next: TraceCategory[]) => void;
};

const LABEL_KEY = {
  read: "world.category.read",
  play: "world.category.play",
  apps: "world.category.apps",
} as const;

/**
 * Multi-select Category filter for the map.
 * Independent from Leave a Memory form category state.
 */
export function CategoryFilter({ selected, onChange }: Props) {
  const t = useT();

  function toggle(category: TraceCategory) {
    if (selected.includes(category)) {
      const next = selected.filter((c) => c !== category);
      onChange(next);
      return;
    }
    onChange(
      CATEGORY_ORDER.filter((c) => selected.includes(c) || c === category),
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="sr-only">{t("world.filterCategoriesAria")}</p>
      <div
        role="group"
        aria-label={t("world.filterCategoriesAria")}
        className="flex flex-wrap gap-2"
      >
        {CATEGORY_ORDER.map((category) => {
          const on = selected.includes(category);
          const color = CATEGORY_MAP_COLORS[category];
          return (
            <button
              key={category}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(category)}
              className={`inline-flex min-h-[40px] items-center gap-2 border px-3 text-[0.72rem] tracking-[0.14em] ${
                on
                  ? "border-[#6b879c] bg-[#e8eef4] font-medium text-[var(--map-ink)]"
                  : "border-[var(--map-line)] bg-white text-[var(--map-muted)]"
              }`}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5"
                style={{
                  clipPath:
                    "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                  backgroundColor: on ? color.fill : "#c5ced6",
                }}
              />
              {t(LABEL_KEY[category])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
