import type { Metadata } from "next";
import { MyMiavPage } from "@/features/world-memory/my-miav/MyMiavPage";

export const metadata: Metadata = {
  title: "My MIAV | MIAV-922228",
  description: "Your MIAV ID and MIAV World activity.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyMiavRoutePage() {
  return <MyMiavPage />;
}
