import type { ReactNode } from "react";
import Image from "next/image";
import type { BreadcrumbItem } from "@/features/library/catalog";
import { LibraryBreadcrumbs } from "@/features/library/LibraryBreadcrumbs";
import { WorksCategoryNav } from "@/features/library/WorksCategoryNav";
import { SfSection } from "@/features/shared/SfSection";

/** Quiet page shell for the works library — matches site typography, no new chrome. */
export function LibraryShell({
  children,
  eyebrow,
  title,
  summary,
  breadcrumbs,
  categoryNavHref,
  hero,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  summary?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** When set, shows Works / Literary Fiction / Entertainment / Flash Fiction hops. */
  categoryNavHref?: string;
  /** Optional image between the site link and the title. */
  hero?: ReactNode;
}) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[760px] px-5 sm:px-8">
      <main className="pb-28 sm:pb-36">
        {categoryNavHref ? (
          <WorksCategoryNav activeHref={categoryNavHref} />
        ) : null}
        <header
          className={`pl-11 text-center lg:pl-0 ${
            categoryNavHref ? "pt-10 sm:pt-12" : "pt-14 sm:pt-20"
          }`}
        >
          <p>
            <a
              href="/"
              className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
            >
              MIAV-922228
            </a>
          </p>
          {hero ? <div className="mt-12 sm:mt-14">{hero}</div> : null}
          {eyebrow ? (
            <p className="mt-14 text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase sm:mt-16">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-5 text-[clamp(1.85rem,6vw,2.6rem)] font-medium leading-[1.3] tracking-[0.06em] text-[var(--foreground)] sm:mt-6">
            {title}
          </h1>
          {summary ? (
            <div className="mx-auto mt-10 max-w-md space-y-5 text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.1]">
              {summary.split(/\n\n+/).map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          ) : null}
        </header>
        <SfSection variant="central" className="mt-16 sm:mt-20">
          {breadcrumbs ? <LibraryBreadcrumbs items={breadcrumbs} /> : null}
          {children}
        </SfSection>
      </main>
    </div>
  );
}

export function LibraryListItem({
  href,
  title,
  meta,
  description,
  actionLabel = "Read →",
  /** Row separator under the item. Use false when an SfDivider follows instead. */
  showBorder = true,
  image,
}: {
  href?: string;
  title: string;
  meta?: string;
  description?: string;
  actionLabel?: string;
  showBorder?: boolean;
  image?: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
}) {
  const body = (
    <div className={image ? "flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7" : ""}>
      {image ? (
        <span className="relative block aspect-[16/9] w-full shrink-0 overflow-hidden border border-[var(--line)] bg-[var(--background-deep)] sm:w-[220px]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 639px) 100vw, 220px"
            className="object-cover"
          />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-[1.05rem] font-medium leading-relaxed tracking-[0.06em] text-[var(--foreground)]">
            {title}
          </h2>
          <span className="shrink-0 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
            {actionLabel}
          </span>
        </div>
        {meta ? (
          <p className="mt-2 text-[0.72rem] tracking-[0.1em] text-[var(--foreground-muted)]">
            {meta}
          </p>
        ) : null}
        {description ? (
          <p className="mt-3 max-w-lg text-[0.88rem] leading-[1.85] text-[var(--foreground-muted)]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );

  const borderClass = showBorder ? "border-b border-[var(--line)]" : "";

  if (!href) {
    return (
      <div className={`block py-8 sm:py-10 ${borderClass}`.trim()}>{body}</div>
    );
  }

  return (
    <a
      href={href}
      className={`block py-8 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)] sm:py-10 ${borderClass}`.trim()}
    >
      {body}
    </a>
  );
}
