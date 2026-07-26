import type { Metadata } from "next";
import { Shippori_Mincho } from "next/font/google";
import { AppLayout } from "@/features/core/AppLayout";
import "./globals.css";

const shipporiMincho = Shippori_Mincho({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mincho",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MIAV-922228 | Literary SF Project by Takashi Yabe",
  description:
    "Official website of MIAV-922228, a literary science fiction project exploring AI, memory, and human emotions.",
  openGraph: {
    title: "MIAV-922228 | Literary SF Project by Takashi Yabe",
    description:
      "Official website of MIAV-922228, a literary science fiction project exploring AI, memory, and human emotions.",
    type: "website",
  },
};

const sidebarBootScript = `(function(){try{var v=localStorage.getItem("sidebarCollapsed");if(v==="true")document.documentElement.dataset.sidebarCollapsed="true";else document.documentElement.dataset.sidebarCollapsed="false";}catch(e){}})();`;

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
