import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drive4Pro4TV | Excellence in Perfection",
  description:
    "Professional driver training built around calm instruction, practical experience, and lasting confidence.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
