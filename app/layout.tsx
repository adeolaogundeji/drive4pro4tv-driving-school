import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drive4Pro4TV | Fountain Driving School Learning Hub",
  description:
    "Driving video learning resources for Fountain Driving School students and families.",
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
