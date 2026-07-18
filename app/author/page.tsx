import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Author | Takashi Yabe — MIAV-922228",
  description:
    "Takashi Yabe is a literary SF writer and the creator of MIAV-922228, a speculative fiction project exploring AI, memory, emotion, and human existence.",
};

const themes = ["AI", "Memory", "Emotion", "Human Existence"] as const;

export default function AuthorPage() {
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
            Author
          </p>

          <h1 className="mt-5 text-[clamp(1.85rem,6vw,2.6rem)] font-medium leading-[1.3] tracking-[0.06em] text-[var(--foreground)] sm:mt-6">
            Takashi Yabe
          </h1>

          <p className="mx-auto mt-10 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.1]">
            Literary SF writer and creator of MIAV-922228.
          </p>
        </header>

        <section className="mt-20 border-t border-[var(--line)] pt-16 sm:mt-28 sm:pt-20">
          <h2 className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
            Profile
          </h2>
          <div className="mt-10 space-y-8 text-[1.02rem] leading-[2.3] tracking-[0.012em] text-[var(--foreground)] sm:mt-12 sm:text-[1.1rem] sm:leading-[2.45]">
            <p>
              Takashi Yabe writes speculative fiction exploring the relationship
              between technology and human existence.
            </p>
            <p>
              Through literary science fiction, he examines themes of artificial
              intelligence, memory, emotion, identity, and the quiet changes that
              occur in everyday life.
            </p>
          </div>
        </section>

        <section className="mt-20 border-t border-[var(--line)] pt-16 sm:mt-28 sm:pt-20">
          <h2 className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
            Project
          </h2>
          <p className="mt-10 text-[1.2rem] font-medium tracking-[0.06em] text-[var(--foreground)] sm:mt-12 sm:text-[1.35rem]">
            <a
              href="/"
              className="transition-opacity duration-300 hover:opacity-80"
            >
              MIAV-922228
            </a>
          </p>
          <p className="mt-8 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:text-base sm:leading-[2.1]">
            A literary science fiction project concerned with how people live,
            remember, and feel in an age reshaped by artificial intelligence.
          </p>
          <p className="mt-12">
            <a
              href="/chapters"
              className="text-[0.78rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
            >
              Chapter archive
            </a>
          </p>
        </section>

        <section className="mt-20 border-t border-[var(--line)] pt-16 sm:mt-28 sm:pt-20">
          <h2 className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
            Themes
          </h2>
          <ul className="mt-10 space-y-5 sm:mt-12">
            {themes.map((theme) => (
              <li
                key={theme}
                className="text-[1.02rem] tracking-[0.04em] text-[var(--foreground)] sm:text-[1.1rem]"
              >
                {theme}
              </li>
            ))}
          </ul>
        </section>

        <nav
          aria-label="Related pages"
          className="mt-24 border-t border-[var(--line)] pt-12 text-center sm:mt-32 sm:pt-16"
        >
          <a
            href="/chapters"
            className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:text-[var(--foreground)]"
          >
            Return to chapters
          </a>
        </nav>
      </main>
    </div>
  );
}
