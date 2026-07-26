import type { Metadata } from "next";
import { FlashFictionPage } from "@/features/library/LibraryPages";

export const metadata: Metadata = {
  title: "Flash Fiction | MIAV-922228",
  description: "Short standalone fiction from MIAV-922228.",
};

export default function FlashFictionRoutePage() {
  return <FlashFictionPage />;
}
