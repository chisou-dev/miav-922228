import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { SitePolicyPageContent } from "@/components/trace/SitePolicyPageContent";

export const metadata: Metadata = {
  title: "Site Policy | MIAV-922228",
  description:
    "Site policy for MIAV World Map — Traces belong to their owners; the operator does not edit user content.",
};

export default function SitePolicyPage() {
  return (
    <SiteShell>
      <main className="pb-28 sm:pb-36">
        <header className="pt-16 text-center sm:pt-24">
          <p className="text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
            Policy
          </p>
          <h1 className="mt-5 text-[clamp(1.85rem,6vw,2.6rem)] font-medium leading-[1.3] tracking-[0.06em] text-[var(--foreground)] sm:mt-6">
            Site Policy
          </h1>
        </header>
        <SitePolicyPageContent />
      </main>
    </SiteShell>
  );
}
