import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
