"use client";

import { clearReadingAttempt } from "@/features/reading-test/session";

const buttonClassName =
  "inline-flex min-h-12 items-center justify-center border border-[var(--line)] px-8 text-[0.78rem] tracking-[0.14em] text-[var(--foreground)] uppercase transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]";

export function StartReadingLink({
  href,
  slug,
  title,
}: {
  href: string;
  slug: string;
  title: string;
}) {
  const hrefWithStart = href.includes("?") ? `${href}&start=1` : `${href}?start=1`;

  return (
    <a
      href={hrefWithStart}
      className={buttonClassName}
      aria-label={`Start reading ${title}`}
      onClick={() => {
        clearReadingAttempt(slug);
      }}
    >
      Start Reading
    </a>
  );
}
