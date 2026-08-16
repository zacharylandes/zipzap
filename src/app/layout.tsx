import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const sharpEarth = localFont({
  src: [
    { path: "./fonts/SharpEarth-Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/SharpEarth-Medium.woff", weight: "500", style: "normal" },
  ],
  variable: "--font-sharp-earth",
  display: "swap",
});

const feijoa = localFont({
  src: [
    { path: "./fonts/feijoa-medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/feijoa-medium-italic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-feijoa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "House Search",
  description: "US rental-yield house search with a crime filter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sharpEarth.variable} ${feijoa.variable}`}>
      <body className="hs-page">
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
