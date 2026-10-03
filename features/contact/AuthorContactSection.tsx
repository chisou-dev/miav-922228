"use client";

import { ContactForm } from "@/features/contact/ContactForm";
import { useT } from "@/features/shared/i18n";
import { SfSection } from "@/features/shared/SfSection";

/** Contact block for the author page — reuses the shared form and API. */
export function AuthorContactSection() {
  const t = useT();

  return (
    <SfSection
      id="contact"
      variant="terminal"
      className="mt-24 scroll-mt-28 border-t border-[var(--line)] pt-20 sm:mt-32 sm:pt-24"
    >
      <h2 className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
        {t("contact.eyebrow")}
      </h2>
      <p className="mt-8 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-10 sm:text-base sm:leading-[2.1]">
        {t("contact.intro")}
      </p>
      <ContactForm />
    </SfSection>
  );
}
