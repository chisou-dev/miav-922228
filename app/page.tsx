import type { Metadata } from "next";
import { HomePage } from "@/features/core/HomePage";
import { AUTHOR_NAME, flashHref, getWorksStarterFlash } from "@/features/library/catalog";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import { EDITORIAL_ART } from "@/features/library/editorialArt";
import { WebSiteJsonLd } from "@/features/library/jsonLd";
import { SITE_DESCRIPTION, SITE_NAME } from "@/features/shared/site";

export const metadata: Metadata = libraryPageMetadata({
  title: `${SITE_NAME} | Stories, Games & Digital Works by ${AUTHOR_NAME}`,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function Home() {
  const starter = getWorksStarterFlash();
  const firstRead = starter
    ? {
        href: flashHref(starter.slug), title: starter.title,
        minutes: starter.minutes, blurb: starter.blurb,
        image: starter.slug === "after-the-rain" ? EDITORIAL_ART.afterRain : null,
      }
    : null;

  return (
    <>
      <WebSiteJsonLd name={SITE_NAME} description={SITE_DESCRIPTION} />
      <HomePage firstRead={firstRead} />
    </>
  );
}
