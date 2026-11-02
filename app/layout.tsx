import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import appleTouchIcon from "./apple-touch-icon.png";
import icon192 from "./icon-192.png";

export const metadata: Metadata = {
  title: "SNAAC Group - Centrale d'achat TPE/PME",
  description: "Optimisez jusqu'à 20% de vos charges grâce à SNAAC Group",
  // Ces noms ne sont pas des conventions Next : importes ici, sinon ils ne seraient pas servis.
  icons: {
    icon: { url: icon192.src, type: "image/png", sizes: "192x192" },
    apple: { url: appleTouchIcon.src, type: "image/png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}