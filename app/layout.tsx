import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoreForge",
  description: "Campaign OS для настольных RPG-кампаний"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <div className="starfield" />
        {children}
      </body>
    </html>
  );
}
