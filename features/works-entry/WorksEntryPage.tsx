import { DataNodeGrid } from "@/features/works-entry/DataNodeGrid";

/** Interactive gate into the Works library — quiet binary sync, not a game. */
export function WorksEntryPage() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[760px] px-5 sm:px-8">
      <main className="pb-28 sm:pb-36">
        <header className="pt-14 pl-11 text-center sm:pt-20 lg:pl-0">
          <p>
            <a
              href="/"
              className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
            >
              MIAV-922228
            </a>
          </p>
          <p className="mt-14 text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase sm:mt-16">
            Works
          </p>
          <h1 className="mt-5 text-[clamp(1.35rem,4.5vw,1.85rem)] font-medium leading-[1.4] tracking-[0.08em] text-[var(--foreground)] sm:mt-6">
            Locate the Data Node
          </h1>
          <p className="mx-auto mt-8 max-w-md text-[0.88rem] leading-[1.9] tracking-[0.04em] text-[var(--foreground-muted)]">
            Tap the node while it is lit. There is no failure — only timing.
          </p>
        </header>

        <section className="mt-14 border-t border-[var(--line)] pt-12 sm:mt-16 sm:pt-14">
          <DataNodeGrid />
        </section>
      </main>
    </div>
  );
}
