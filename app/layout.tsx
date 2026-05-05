import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NUUK × Vijay Sales Dashboard",
  description: "Daily sales tracker for NUUK at Vijay Sales outlets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
