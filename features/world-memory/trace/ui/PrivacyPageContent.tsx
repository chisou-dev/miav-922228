import { PRIVACY_PAGE_PARAGRAPHS } from "@/lib/trace/policyCopy";

export function PrivacyPageContent() {
  return (
    <article className="mx-auto mt-16 max-w-lg border-t border-[var(--line)] pt-14 sm:mt-20 sm:pt-16">
      <div className="space-y-8 text-[0.98rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:text-[1.02rem] sm:leading-[2.15]">
        {PRIVACY_PAGE_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <p className="mt-16 text-[0.78rem] leading-[1.9] tracking-[0.04em] text-[var(--foreground-muted)]">
        World Memory stores only: Firebase UID, MIAV ID, auth type, location,
        message, and timestamps. Temporary (anonymous) traces also carry an
        expiry time.
      </p>

      <p className="mt-10 flex flex-wrap gap-6 text-[0.85rem] tracking-[0.12em]">
        <a
          href="/site-policy"
          className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em]"
        >
          Site Policy
        </a>
        <a
          href="/world-map"
          className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em]"
        >
          Return to World Memory
        </a>
      </p>
    </article>
  );
}
