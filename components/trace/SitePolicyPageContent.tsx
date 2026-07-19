import { SITE_POLICY_PAGE } from "@/lib/trace/policyCopy";

export function SitePolicyPageContent() {
  return (
    <article className="mx-auto mt-16 max-w-lg border-t border-[var(--line)] pt-14 sm:mt-20 sm:pt-16">
      <div className="space-y-8 text-[0.98rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:text-[1.02rem] sm:leading-[2.15]">
        <p>{SITE_POLICY_PAGE.intro}</p>
        {SITE_POLICY_PAGE.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <div>
          <p>{SITE_POLICY_PAGE.removeHeading}</p>
          <ul className="mt-4 list-none space-y-2">
            {SITE_POLICY_PAGE.removeReasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>

        <p>{SITE_POLICY_PAGE.googleNote}</p>
        <p>{SITE_POLICY_PAGE.noPii}</p>
      </div>

      <p className="mt-12 flex flex-wrap gap-6 text-[0.85rem] tracking-[0.12em]">
        <a
          href="/privacy"
          className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em]"
        >
          Privacy
        </a>
        <a
          href="/world-map"
          className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em]"
        >
          Return to World Map
        </a>
      </p>
    </article>
  );
}
