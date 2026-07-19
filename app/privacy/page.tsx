import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { PrivacyPageContent } from "@/components/trace/PrivacyPageContent";

export const metadata: Metadata = {
  title: "Privacy | MIAV-922228",
  description:
    "Privacy policy for MIAV World Memory — Google Sign-In is used only to identify Trace ownership. No Google profile data is stored.",
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
        <PrivacyPageContent />
      </main>
    </SiteShell>
  );
}
