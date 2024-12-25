import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UFC Fighter Rankings",
  description: "Historical UFC fighter rankings based on fight scores",
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
