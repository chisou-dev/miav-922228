import type { Metadata } from "next";
import { WorksEntryPage } from "@/features/works-entry/WorksEntryPage";

export const metadata: Metadata = {
  title: "Works Entry | MIAV-922228",
  description:
    "A quiet interactive entrance to the MIAV-922228 Works library.",
};

export default function WorksEntryRoutePage() {
  return <WorksEntryPage />;
}
