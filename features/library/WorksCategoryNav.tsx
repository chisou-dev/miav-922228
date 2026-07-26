import { categories, worksLibrary } from "@/features/library/catalog";

const links = [
  { href: "/works", label: worksLibrary.title, id: "works" as const },
  ...categories.map((category) => ({
    href: category.path,
    label: category.title,
    id: category.id,
  })),
];

type Props = {
  /** Current path for active state, e.g. `/works` or `/literary-sf`. */
  activeHref: string;
};

/**
 * Compact Works category hops — page chrome only, never in the site sidebar.
 */
export function WorksCategoryNav({ activeHref }: Props) {
  return (
    <nav
      aria-label="Works categories"
      className="border-b border-[var(--line)] pb-6 pt-8 text-center sm:pb-7"
    >
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.68rem] tracking-[0.12em] text-[var(--foreground-muted)]">
        {links.map((link, index) => {
          const active = link.href === activeHref;
          return (
            <li key={link.id} className="flex items-center gap-x-5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-[var(--line)]">
                  ·
                </span>
              ) : null}
              <a
                href={link.href}
                className={
                  active
                    ? "text-[var(--foreground)]"
                    : "transition-colors duration-300 hover:text-[var(--foreground)]"
                }
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
