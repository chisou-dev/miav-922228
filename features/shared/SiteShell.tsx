"use client";

import { LanguageSwitcher, useT, type MessageKey } from "@/features/shared/i18n";
import { sfSectionClass } from "@/features/shared/SfSection";

const navLinks = [
  { href: "/#about", labelKey: "nav.about" },
  { href: "/chapters", labelKey: "nav.chapters" },
  { href: "/books", labelKey: "nav.books" },
  { href: "/world-map", labelKey: "nav.world" },
  { href: "/contact", labelKey: "nav.contact" },
] as const satisfies readonly { href: string; labelKey: MessageKey }[];

export function SiteHeader() {
  const t = useT();

  return (
    <header className="flex flex-col gap-8 pt-10 pl-11 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10 sm:pt-14 lg:pl-0">
      <a
        href="/"
        className="text-[0.8rem] tracking-[0.18em] text-[var(--foreground)]"
      >
        MIAV-922228
      </a>
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 sm:justify-end">
        <nav aria-label={t("nav.primaryAria")}>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[0.8rem] tracking-[0.14em] text-[var(--foreground-muted)] uppercase sm:justify-end">
            {navLinks.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="transition-opacity duration-300 hover:text-[var(--foreground)]"
                >
                  {t(item.labelKey)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useT();

  return (
    <footer
      className={sfSectionClass(
        "terminal",
        "py-12 text-center text-[0.75rem] tracking-[0.16em] text-[var(--foreground-muted)] sm:py-16",
      )}
    >
      <p>MIAV-922228</p>
      <p className="mt-5 flex flex-wrap justify-center gap-6">
        <a
          href="/privacy"
          className="underline decoration-[var(--line)] underline-offset-[0.4em] transition-colors duration-300 hover:text-[var(--foreground)]"
        >
          {t("footer.privacy")}
        </a>
        <a
          href="/site-policy"
          className="underline decoration-[var(--line)] underline-offset-[0.4em] transition-colors duration-300 hover:text-[var(--foreground)]"
        >
          {t("footer.sitePolicy")}
        </a>
      </p>
    </footer>
  );
}

export function SiteShell({
  children,
  className,
}: {
  children: React.ReactNode;
  /** Optional width override, e.g. Home hero needs room for the binary preview. */
  className?: string;
}) {
  return (
    <div
      className={`relative z-10 mx-auto flex w-full flex-col px-8 sm:px-12 ${className ?? "max-w-3xl"}`}
    >
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
