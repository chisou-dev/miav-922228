import type { Metadata } from "next";
import { AppsPage } from "@/features/core/AppsPage";
import { libraryPageMetadata } from "@/features/library/pageMetadata";

export const metadata: Metadata = libraryPageMetadata({
  title: "Apps | MIAV-922228",
  description: "Apps and creative tools from MIAV-922228.",
  path: "/apps",
});

export default function AppsRoutePage() {
  return <AppsPage />;
}
