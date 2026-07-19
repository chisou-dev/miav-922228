import type { Metadata } from "next";
import { TraceMapApp } from "@/components/trace-map/TraceMapApp";

export const metadata: Metadata = {
  title: "MIAV World Map | Trace Map — MIAV-922228",
  description:
    "Leave a single quiet Trace on the MIAV World Map — a literary register of presence, not analytics.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function WorldMapPage() {
  return <TraceMapApp />;
}
