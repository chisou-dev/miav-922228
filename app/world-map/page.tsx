import type { Metadata } from "next";
import { TraceMapApp } from "@/components/trace-map/TraceMapApp";

export const metadata: Metadata = {
  title: "MIAV World Memory — MIAV-922228",
  description:
    "A quiet record of visitors to MIAV-922228. Leave a single Trace — a mark that you were here.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function WorldMapPage() {
  return <TraceMapApp />;
}
