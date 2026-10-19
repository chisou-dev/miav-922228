import { HomePage } from "@/features/core/HomePage";
import { flashHref, getWorksStarterFlash } from "@/features/library/catalog";
import { WebSiteJsonLd } from "@/features/library/jsonLd";
import { SITE_DESCRIPTION, SITE_NAME } from "@/features/shared/site";

export default function Home() {
  const starter = getWorksStarterFlash();
  const firstRead = starter
    ? { href: flashHref(starter.slug), title: starter.title, minutes: starter.minutes }
    : null;

  return (
    <>
      <WebSiteJsonLd name={SITE_NAME} description={SITE_DESCRIPTION} />
      <HomePage firstRead={firstRead} />
    </>
  );
}
