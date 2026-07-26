import type { BreadcrumbItem } from "@/features/library/catalog";

/** Compact trail for works library pages — quiet typography, no extra chrome. */
export function LibraryBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="pt-8 text-[0.68rem] leading-[1.7] tracking-[0.08em] text-[var(--foreground-muted)]"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-[var(--line)]">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="transition-colors duration-300 hover:text-[var(--foreground)]"
                >
                  {item.label}
                </a>
              ) : (
                <span className={isLast ? "text-[var(--foreground-muted)]" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
