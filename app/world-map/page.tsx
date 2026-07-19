import type { Metadata } from "next";
import { TraceMapApp } from "@/components/trace-map/TraceMapApp";

export const metadata: Metadata = {
  title: "World Memory — MIAV-922228",
  description:
    "Reader traces preserved around the world. A quiet record of presence in MIAV-922228.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function WorldMapPage() {
  return <TraceMapApp />;
}
