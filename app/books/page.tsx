import type { Metadata } from "next";
import { getAllBooks } from "@/lib/content/books";

export const metadata: Metadata = {
  title: "Books | MIAV-922228",
  description:
    "Books and editions from MIAV-922228, a literary science fiction project exploring AI, memory, emotion, and human existence.",
};

export default function BooksPage() {
  const archive = getAllBooks();

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

          <p className="mt-14 text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase sm:mt-16">
            Books
          </p>

          <h1 className="mt-5 text-[clamp(1.85rem,6vw,2.6rem)] font-medium leading-[1.3] tracking-[0.06em] text-[var(--foreground)] sm:mt-6">
            MIAV-922228
          </h1>

          <p className="mx-auto mt-10 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.1]">
            A literary science fiction project exploring AI, memory, emotion,
            and human existence.
          </p>
        </header>

        <ol className="mt-20 list-none sm:mt-28">
          {archive.map((book) => (
            <li
              key={book.id}
              className="border-t border-[var(--line)] py-20 sm:py-28"
            >
              <article>
                <p className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
                  Volume {String(book.volume).padStart(2, "0")}
                </p>

                <h2 className="mt-6 text-[1.45rem] font-medium tracking-[0.05em] text-[var(--foreground)] sm:mt-8 sm:text-[1.75rem] sm:tracking-[0.06em]">
                  {book.title}
                </h2>

                <div className="mt-10 sm:mt-12">
                  <h3 className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
                    Description
                  </h3>
                  <p className="mt-6 max-w-lg text-[1.02rem] leading-[2.3] tracking-[0.012em] text-[var(--foreground)] sm:text-[1.1rem] sm:leading-[2.45]">
                    {book.description}
                  </p>
                </div>

                <div className="mt-16 space-y-14 sm:mt-20 sm:space-y-16">
                  {book.editions.map((edition) => (
                    <section key={edition.id}>
                      <h3 className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
                        {edition.label}
                      </h3>

                      {edition.status === "coming_soon" ? (
                        <p className="mt-6 text-[0.95rem] tracking-[0.04em] text-[var(--foreground-muted)] sm:text-base">
                          Coming soon
                        </p>
                      ) : edition.href ? (
                        <p className="mt-8">
                          <a
                            href={edition.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
                          >
                            {edition.linkLabel ?? "Available on Amazon Kindle"}
                          </a>
                        </p>
                      ) : (
                        <p className="mt-6 text-[0.95rem] tracking-[0.04em] text-[var(--foreground-muted)] sm:text-base">
                          Link forthcoming
                        </p>
                      )}
                    </section>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ol>

        <p className="border-t border-[var(--line)] pt-16 text-[0.72rem] leading-relaxed tracking-[0.12em] text-[var(--foreground-muted)] sm:pt-20">
          Further volumes will be entered here as they are published.
        </p>

        <nav
          aria-label="Related pages"
          className="mt-16 text-center sm:mt-20"
        >
          <a
            href="/chapters"
            className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:text-[var(--foreground)]"
          >
            Chapter archive
          </a>
        </nav>
      </main>
    </div>
  );
}
