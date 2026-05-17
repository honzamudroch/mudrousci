import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naše cesta ...",
  description: "Naše společné vzpomínky",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
