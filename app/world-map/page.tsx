import type { Metadata } from "next";
import { TraceMapApp } from "@/features/world-memory/map/TraceMapApp";

export const metadata: Metadata = {
  title: "MIAV World  EMIAV-922228",
  description:
    "Reader traces preserved around the world. A quiet record of presence in MIAV-922228.",
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
