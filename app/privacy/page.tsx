import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = {
  title: "Privacy | MIAV-922228",
  description:
    "Privacy policy for MIAV World Map — Google Sign-In is used only to identify Trace ownership. No Google profile data is stored.",
};

export default function PrivacyPage() {
  return (
    <SiteShell>
      <main className="pb-28 sm:pb-36">
        <header className="pt-16 text-center sm:pt-24">
          <p className="text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
            Policy
          </p>
          <h1 className="mt-5 text-[clamp(1.85rem,6vw,2.6rem)] font-medium leading-[1.3] tracking-[0.06em] text-[var(--foreground)] sm:mt-6">
            Privacy
          </h1>
        </header>

        <article className="mx-auto mt-16 max-w-lg border-t border-[var(--line)] pt-14 sm:mt-20 sm:pt-16">
          <div className="space-y-8 text-[0.98rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:text-[1.02rem] sm:leading-[2.15]">
            <p>
              MIAV World Map uses Google Sign-In only to identify the owner of a
              Trace.
            </p>
            <p>
              This website does not store your email address, name, profile
              photo, or other Google account information.
            </p>
            <p>
              Only an anonymous Firebase UID is stored so that only you can edit
              your Trace.
            </p>
            <p>Google account data is never accessed.</p>
            <p>Your Trace belongs to you.</p>
            <p>
              The site provides a place for readers to leave a Trace, but does
              not edit user content.
            </p>
            <p>
              The operator may remove content only when required by law or when
              it violates the site&apos;s rules.
            </p>
          </div>

          <p className="mt-16 text-[0.78rem] leading-[1.9] tracking-[0.04em] text-[var(--foreground-muted)]">
            Trace Map stores only: Firebase UID, MIAV ID, auth type, location,
            message, and timestamps. Temporary (anonymous) traces also carry an
            expiry time.
          </p>

          <p className="mt-12">
            <a
              href="/world-map"
              className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em]"
            >
              Return to World Map
            </a>
          </p>
        </article>
      </main>
    </SiteShell>
  );
}
