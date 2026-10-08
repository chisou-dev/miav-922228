import Link from "next/link";
import { flashTests } from "@/features/reading-test/stories/flash-tests";

const readingTestSlugs = new Set(flashTests.map((test) => test.slug));

const linkClassName =
  "text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:text-[var(--foreground)]";

type Props = {
  slug: string;
};

/** Quiet next steps after flash fiction — outside the story text. */
export function FlashPieceAfterNav({ slug }: Props) {
  const hasReadingTest = readingTestSlugs.has(slug);

  return (
    <nav
      aria-label="After reading"
      className="mt-20 border-t border-[var(--line)] pt-14 sm:mt-24 sm:pt-16"
    >
      <p className="text-center text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
        <Link href="/flash-fiction" className={linkClassName}>
          Read another story
        </Link>
        {hasReadingTest ? (
          <>
            <span className="mx-3 select-none opacity-50" aria-hidden="true">
              ·
            </span>
            <Link href={`/reading-test/${slug}`} className={linkClassName}>
              Try the reading test
            </Link>
          </>
        ) : null}
      </p>
    </nav>
  );
}
