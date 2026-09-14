import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPUS · Owner overview",
  description: "Private OPUS owner dashboard.",
  robots: { index: false, follow: false },
  icons: { icon: "/opus-mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
