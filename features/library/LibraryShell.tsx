import type { ReactNode } from "react";

/** Quiet page shell for the works library — matches site typography, no new chrome. */
export function LibraryShell({
  children,
  eyebrow,
  title,
  summary,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  summary?: string;
}) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[700px] px-5 sm:px-8">
      <main className="pb-28 sm:pb-36">
        <header className="pt-14 text-center sm:pt-20">
          <p>
            <a
              href="/"
              className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
            >
              MIAV-922228
            </a>
          </p>
          {eyebrow ? (
            <p className="mt-14 text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase sm:mt-16">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-5 text-[clamp(1.85rem,6vw,2.6rem)] font-medium leading-[1.3] tracking-[0.06em] text-[var(--foreground)] sm:mt-6">
            {title}
          </h1>
          {summary ? (
            <p className="mx-auto mt-10 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.1]">
              {summary}
            </p>
          ) : null}
        </header>
        <section className="mt-16 border-t border-[var(--line)] sm:mt-20">
          {children}
        </section>
      </main>
    </div>
  );
}

export function LibraryListItem({
  href,
  title,
  meta,
  description,
}: {
  href: string;
  title: string;
  meta?: string;
  description?: string;
}) {
  return (
    <a
      href={href}
      className="block border-b border-[var(--line)] py-8 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)] sm:py-10"
    >
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="text-[1.05rem] font-medium tracking-[0.06em] text-[var(--foreground)]">
          {title}
        </h2>
        <span className="shrink-0 text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)]">
          Read →
        </span>
      </div>
      {meta ? (
        <p className="mt-2 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
          {meta}
        </p>
      ) : null}
      {description ? (
        <p className="mt-3 max-w-lg text-[0.88rem] leading-[1.85] text-[var(--foreground-muted)]">
          {description}
        </p>
      ) : null}
    </a>
  );
}
