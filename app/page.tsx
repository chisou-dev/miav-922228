import { HomePage } from "@/features/core/HomePage";
import { WebSiteJsonLd } from "@/features/library/jsonLd";
import { SITE_DESCRIPTION, SITE_NAME } from "@/features/shared/site";

export default function Home() {
  return (
    <>
      <WebSiteJsonLd name={SITE_NAME} description={SITE_DESCRIPTION} />
      <HomePage />
    </>
  );
}
