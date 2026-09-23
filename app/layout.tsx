import type { Metadata } from "next";
import "./globals.css";

const description =
  "Настольные RPG-кампании в одном месте: персонажи, NPC, сцены, чат, кубики, секреты мастера и подключаемые игровые миры.";

export const metadata: Metadata = {
  title: {
    default: "LoreForge — Campaign OS",
    template: "%s — LoreForge"
  },
  description,
  applicationName: "LoreForge",
  openGraph: {
    title: "LoreForge — Campaign OS для настольных RPG",
    description,
    siteName: "LoreForge",
    locale: "ru_RU",
    type: "website"
  }
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
