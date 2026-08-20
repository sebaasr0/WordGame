import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WordGame",
  description: "Build a longer word each round — every letter carries over, plus one new one.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
