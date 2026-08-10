import type { Metadata } from "next";
import { Shippori_Mincho } from "next/font/google";
import { AppLayout } from "@/features/core/AppLayout";
import { getSiteUrl } from "@/features/shared/site";
import { miavOgMetadataImages } from "@/features/stories/miav/miavVisual";
import "./globals.css";

const shipporiMincho = Shippori_Mincho({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mincho",
  display: "swap",
});

const siteTitle = "MIAV-922228 | Literary SF Project by Takashi Yabe";
const siteDescription =
  "Official website of MIAV-922228, a literary science fiction project exploring AI, memory, and human emotions.";
const ogImages = miavOgMetadataImages();

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    siteName: "MIAV-922228",
    images: ogImages,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ogImages.map((image) => image.url),
  },
};

const sidebarBootScript = `(function(){try{var v=localStorage.getItem("sidebarCollapsed");if(v==="true")document.documentElement.dataset.sidebarCollapsed="true";else document.documentElement.dataset.sidebarCollapsed="false";}catch(e){}try{var l=localStorage.getItem("miav_ui_locale");if(l==="en"||l==="fr"||l==="es")document.documentElement.lang=l;else document.documentElement.lang="en";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${shipporiMincho.variable} h-full`}>
      <body className={`${shipporiMincho.className} min-h-full antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: sidebarBootScript }} />
        <div className="site-canvas relative">
          <AppLayout>{children}</AppLayout>
        </div>
      </body>
    </html>
  );
}
