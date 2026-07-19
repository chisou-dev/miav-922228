import type { Metadata } from "next";
import { AdminContactsClient } from "./AdminContactsClient";

export const metadata: Metadata = {
  title: "Contact Archive | Admin — MIAV-922228",
  description: "Administrator archive of contact messages for MIAV-922228.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminContactsPage() {
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
            Admin
          </p>

          <h1 className="mt-5 text-[clamp(1.85rem,6vw,2.6rem)] font-medium leading-[1.3] tracking-[0.06em] text-[var(--foreground)] sm:mt-6">
            問い合わせ管理
          </h1>

          <p className="mx-auto mt-10 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.1]">
            新しい順に表示されます。カードを開くと既読になります。
          </p>
        </header>

        <section className="border-t border-[var(--line)]">
          <AdminContactsClient />
        </section>
      </main>
    </div>
  );
}
