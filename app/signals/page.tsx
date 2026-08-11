import type { Metadata } from "next";
import { SignalsRedirectPage } from "@/features/signals/SignalsRedirectPage";

export const metadata: Metadata = {
  title: "Signals | MIAV-922228",
  description: "Signals are part of My MIAV.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignalsPage() {
  return <SignalsRedirectPage />;
}
