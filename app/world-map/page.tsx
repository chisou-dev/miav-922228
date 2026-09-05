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

type PageProps = {
  searchParams: Promise<{ work?: string }>;
};

export default async function WorldMapPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <TraceMapApp initialWorkQuery={params.work ?? null} />;
}
