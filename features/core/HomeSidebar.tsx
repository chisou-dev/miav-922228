"use client";

import { ReaderMemory } from "@/features/core/ReaderMemory";

export function HomeSidebar() {
  return (
    <aside className="home-sidebar hidden lg:block">
      <div className="home-sidebar-inner">
        <p className="text-[0.68rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
          Works
        </p>
        <ul className="mt-6 space-y-4">
          <li>
            <a
              href="/works"
              className="text-[0.82rem] tracking-[0.1em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
            >
              Works
            </a>
          </li>
        </ul>

        <div className="mt-12 border-t border-[var(--line)] pt-8">
          <a
            href="/world-map"
            className="group block text-[0.82rem] leading-[1.7] tracking-[0.08em] text-[var(--foreground)]"
          >
            <span className="mr-2 inline-block opacity-80" aria-hidden>
              🌍
            </span>
            World Memory
            <span className="mt-2 block text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)] group-hover:text-[var(--foreground)]">
              Reader traces preserved around the world.
            </span>
          </a>
        </div>

        <div className="mt-10">
          <ReaderMemory workId="miav-922228" />
        </div>
      </div>
    </aside>
  );
}
