import type { Metadata } from "next";
import { Shippori_Mincho } from "next/font/google";
import { AppLayout } from "@/features/core/AppLayout";
import { AUTHOR_NAME } from "@/features/library/catalog";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/features/shared/site";
import { miavOgMetadataImages } from "@/features/stories/miav/miavVisual";
import "./globals.css";

const shipporiMincho = Shippori_Mincho({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mincho",
  display: "swap",
});

const ogImages = miavOgMetadataImages();
const siteTitle = `${SITE_NAME} | Literary SF Project by ${AUTHOR_NAME}`;

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: siteTitle,
  description: SITE_DESCRIPTION,
  authors: [{ name: AUTHOR_NAME, url: "/author" }],
  creator: AUTHOR_NAME,
  openGraph: {
    title: siteTitle,
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: SITE_NAME,
    images: ogImages,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: SITE_DESCRIPTION,
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
