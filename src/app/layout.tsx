import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Tulip Memory Gallery",
  description: "An interactive 3D tulip gallery for six memories.",
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
