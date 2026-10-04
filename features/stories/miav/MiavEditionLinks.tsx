import { MIAV_PART_THREE_KINDLE_URL } from "@/features/stories/miav/books";
import { chapterArchivePath } from "@/features/stories/miav/edition";

const linkClass =
  "underline decoration-[var(--line)] underline-offset-[0.35em] transition-colors duration-300 hover:text-[var(--foreground)]";

/**
 * Part I–III edition row used on the MIAV series page and Works.
 * Part III English goes straight to the confirmed Kindle listing.
 */
export function MiavEditionLinks() {
  return (
    <div className="space-y-3 border-b border-[var(--line)] pb-8 text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)]">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="uppercase tracking-[0.18em]">Part I</span>
        <a
          href={chapterArchivePath("en")}
          className={linkClass}
          hrefLang="en"
        >
          English
        </a>
        <span aria-hidden="true" className="opacity-40">
          ·
        </span>
        <a
          href={chapterArchivePath("fr")}
          className={linkClass}
          hrefLang="fr"
        >
          Français
        </a>
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="uppercase tracking-[0.18em]">Part II · Homeward</span>
        <a href="/books" className={linkClass}>
          English
        </a>
        <span aria-hidden="true" className="opacity-40">
          ·
        </span>
        <span>Français bientôt disponible</span>
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="uppercase tracking-[0.18em]">
          Part III · The Edge of the World
        </span>
        <a
          href={MIAV_PART_THREE_KINDLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          English
        </a>
        <span aria-hidden="true" className="opacity-40">
          ·
        </span>
        <span>Français bientôt disponible</span>
      </p>
    </div>
  );
}
