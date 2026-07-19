const navLinks = [
  { href: "/#about", label: "About" },
  { href: "/chapters", label: "Chapters" },
  { href: "/books", label: "Books" },
  { href: "/author", label: "Author" },
  { href: "/world-map", label: "World Map" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="flex flex-col gap-8 pt-10 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10 sm:pt-14">
      <a
        href="/"
        className="text-[0.8rem] tracking-[0.18em] text-[var(--foreground)]"
      >
        MIAV-922228
      </a>
      <nav aria-label="Primary">
        <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[0.8rem] tracking-[0.14em] text-[var(--foreground-muted)] uppercase sm:justify-end">
          {navLinks.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="transition-opacity duration-300 hover:text-[var(--foreground)]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] py-12 text-center text-[0.75rem] tracking-[0.16em] text-[var(--foreground-muted)] sm:py-16">
      <p>MIAV-922228</p>
      <p className="mt-5">
        <a
          href="/privacy"
          className="underline decoration-[var(--line)] underline-offset-[0.4em] transition-colors duration-300 hover:text-[var(--foreground)]"
        >
          Privacy
        </a>
      </p>
    </footer>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-8 sm:px-12">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
