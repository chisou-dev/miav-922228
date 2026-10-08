import type { ReactNode } from "react";

export function ReadingTestFrame({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow?: string;
  title: string;
  summary?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[760px] px-5 sm:px-8">
      <main className="pb-28 sm:pb-36">
        <header className="pt-14 pl-11 text-center sm:pt-20 lg:pl-0">
          {eyebrow ? (
            <p className="text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
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
        {children}
      </main>
    </div>
  );
}
