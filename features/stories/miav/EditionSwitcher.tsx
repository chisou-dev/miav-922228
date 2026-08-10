import type { ChapterEdition } from "@/features/stories/miav/edition";
import {
  chapterArchivePath,
  chapterPath,
} from "@/features/stories/miav/edition";

type Props = {
  edition: ChapterEdition;
  /** When set, links to the matching chapter slug in the other edition. */
  slug?: string;
};

/**
 * Work-edition switch for MIAV-922228 chapter text (EN | FR).
 * Independent of the site UI language switcher (EN / FR / ES).
 */
export function EditionSwitcher({ edition, slug }: Props) {
  const enHref = slug ? chapterPath(slug, "en") : chapterArchivePath("en");
  const frHref = slug ? chapterPath(slug, "fr") : chapterArchivePath("fr");

  return (
    <nav
      aria-label="Edition"
      className="mt-6 flex items-center justify-center gap-2 text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)]"
    >
      <EditionLink href={enHref} label="EN" active={edition === "en"} />
      <span aria-hidden="true" className="opacity-40">
        |
      </span>
      <EditionLink href={frHref} label="FR" active={edition === "fr"} />
    </nav>
  );
}

function EditionLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  if (active) {
    return (
      <span
        aria-current="page"
        className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.35em]"
      >
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      className="transition-colors duration-300 hover:text-[var(--foreground)]"
      hrefLang={label === "EN" ? "en" : "fr"}
    >
      {label}
    </a>
  );
}
