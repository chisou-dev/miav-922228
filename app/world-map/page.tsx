import type { Metadata } from "next";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import { TraceMapApp } from "@/features/world-memory/map/TraceMapApp";

export const metadata: Metadata = {
  ...libraryPageMetadata({
    title: "MIAV World | MIAV-922228",
    description:
      "Reader traces preserved around the world. A quiet record of presence in MIAV-922228.",
    path: "/world-map",
  }),
  robots: {
    index: true,
    follow: true,
  },
};

export default function WorldMapPage() {
  return <TraceMapApp />;
}
