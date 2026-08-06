import { SiteShell } from "@/features/shared/SiteShell";
import { ReaderMemory } from "@/features/core/ReaderMemory";
import { getGamesBaseUrl, gamesLibraryUrl } from "@/features/core/gamesUrl";
import { flashHref } from "@/features/library/catalog";

const linkClassName =
  "text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]";

const entryClassName =
  "scroll-mt-24 border-t border-[var(--line)] py-24 sm:py-32";

export function HomePage() {
  const gameHref = gamesLibraryUrl();
  const binaryBlockHref = `${getGamesBaseUrl()}/game/binary-mosaic`;
  const afterTheRainHref = flashHref("after-the-rain");

  return (
    <SiteShell>
      <main>
        <section
          aria-label="Introduction"
          className="flex min-h-[calc(100vh-8rem)] flex-col justify-center py-24 sm:py-32"
        >
          <h1 className="text-[clamp(2.4rem,7vw,4.25rem)] font-medium leading-[1.15] tracking-[0.04em] text-[var(--foreground)]">
            MIAV
          </h1>
          <p className="mt-10 max-w-xl text-[1.05rem] leading-relaxed tracking-[0.02em] text-[var(--foreground-muted)] sm:text-lg sm:leading-8">
            READ. PLAY. LEAVE A TRACE.
          </p>
          <p className="mt-16 max-w-md text-[0.95rem] leading-[1.9] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-20 sm:text-base sm:leading-[2]">
            Stories, browser games, and digital experiments exploring memory,
            artificial intelligence, technology, loneliness, and human
            existence.
          </p>
          <p className="mt-12 flex flex-wrap gap-x-8 gap-y-4 sm:mt-14">
            <a href="#start-here" className={linkClassName}>
              START HERE
            </a>
            <a href="/works" className={linkClassName}>
              READ STORIES
            </a>
            <a href={gameHref} className={linkClassName}>
              PLAY GAMES
            </a>
          </p>
        </section>

        <div className="pb-32 sm:pb-40">
          <section id="start-here" className={entryClassName}>
            <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              START HERE
            </h2>

            <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
              <div>
                <h3 className="text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  READ
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  Short speculative fiction about memory, technology, and human
                  existence.
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href="/works" className={linkClassName}>
                    Enter Works
                  </a>
                </p>
                <p className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                  <a href="/chapters" className={linkClassName}>
                    Chapters
                  </a>
                  <a href="/books" className={linkClassName}>
                    Books
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  PLAY
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  Browser games built around logic, discovery, and strange
                  digital worlds.
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href={gameHref} className={linkClassName}>
                    Enter Games
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  LEAVE A TRACE
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  Add a small memory to World Memory and become part of its
                  growing map.
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href="/world-map" className={linkClassName}>
                    Open World Memory
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section id="featured-now" className={entryClassName}>
            <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              FEATURED NOW
            </h2>

            <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
              <div>
                <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
                  READ
                </p>
                <h3 className="mt-4 text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  After the Rain
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  A stranger beneath a bookshop awning remembers the hill
                  differently.
                </p>
                <p className="mt-4 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                  About 2 minutes
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href={afterTheRainHref} className={linkClassName}>
                    Read →
                  </a>
                </p>
              </div>

              <div>
                <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
                  PLAY
                </p>
                <h3 className="mt-4 text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  Binary Block
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  A logic puzzle about shape, rotation, and hidden structure.
                </p>
                <p className="mt-4 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                  Play in your browser
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href={binaryBlockHref} className={linkClassName}>
                    Play →
                  </a>
                </p>
              </div>

              <div>
                <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
                  LEAVE A TRACE
                </p>
                <h3 className="mt-4 text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  World Memory
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  Add one small memory to a growing map of human traces.
                </p>
                <p className="mt-4 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                  Join the map
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href="/world-map" className={linkClassName}>
                    Enter →
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section
            aria-label="Reader memory"
            className="scroll-mt-24 border-t border-[var(--line)] py-24 sm:py-32"
          >
            <ReaderMemory workId="miav-922228" />
          </section>

          <section id="about" className={entryClassName}>
            <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              About MIAV
            </h2>
            <p className="mt-10 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              MIAV is an independent literary science fiction project bringing
              together stories, browser games, and digital experiments. Across
              fiction and interactive works, it explores memory, artificial
              intelligence, loneliness, technology, and human existence.
            </p>
          </section>

          <section id="contact" className={entryClassName}>
            <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              Contact
            </h2>
            <p className="mt-10 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              For inquiries regarding the project, publications, or press,
              please get in touch.
            </p>
            <p className="mt-12 sm:mt-14">
              <a href="/contact" className={linkClassName}>
                Write a message
              </a>
            </p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
