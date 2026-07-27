import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game | MIAV-922228",
  description: "MIAV-922228 — interactive experience (coming soon).",
};

export default function GamePage() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[700px] px-5 sm:px-8">
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
          <h1 className="mt-14 text-[clamp(1.85rem,6vw,2.4rem)] font-medium leading-[1.3] tracking-[0.06em] text-[var(--foreground)] sm:mt-16">
            Game
          </h1>
          <p className="mx-auto mt-10 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)]">
            An interactive experience is in preparation.
          </p>
        </header>
      </main>
    </div>
  );
}
