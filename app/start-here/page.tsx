import type { Metadata } from "next";
import { StartHerePage } from "@/features/core/StartHerePage";
import { BreadcrumbJsonLd } from "@/features/library/jsonLd";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import { t } from "@/features/shared/i18n";

export const metadata: Metadata = libraryPageMetadata({
  title: t("startHere.seoTitle"),
  description: t("startHere.seoDescription"),
  path: "/start-here",
});

export default function StartHereRoutePage() {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: t("startHere.pageTitle"), href: "/start-here" },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <StartHerePage />
    </>
  );
}
