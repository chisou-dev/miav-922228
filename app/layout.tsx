import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/styles/luna.css";

export const metadata: Metadata = {
  title: "MIAV Games",
  description: "Interactive games for the MIAV-922228 universe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <div className="site-canvas min-h-full">{children}</div>
      </body>
    </html>
  );
}
