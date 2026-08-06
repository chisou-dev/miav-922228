import { miavPartTwo } from "@/features/stories/miav/work";

/**
 * Compact Part II notice for the unlocked final chapter only.
 * Kindle URL is managed solely via miavPartTwo.kindleUrl.
 */
export function PartTwoNotice() {
  const url = miavPartTwo.kindleUrl?.trim() || null;
  const hasUrl = Boolean(url);

  return (
    <aside
      className="mt-16 border-t border-[var(--line)] pt-10 sm:mt-20 sm:pt-12"
      aria-label="Part II"
    >
      <p className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
        {miavPartTwo.eyebrow}
      </p>
      <h2 className="mt-4 text-[1.15rem] font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-[1.25rem]">
        {miavPartTwo.title}
      </h2>
      <p className="mt-5 max-w-md text-[0.95rem] leading-[1.9] tracking-[0.01em] text-[var(--foreground-muted)]">
        {miavPartTwo.description}
      </p>
      <p className="mt-8">
        {hasUrl && url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--foreground-muted)]"
          >
            {miavPartTwo.linkLabel}
          </a>
        ) : (
          <span className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground-muted)]">
            {miavPartTwo.comingSoonLabel}
          </span>
        )}
      </p>
    </aside>
  );
}
