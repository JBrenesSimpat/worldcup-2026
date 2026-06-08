import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { TimezoneProvider } from "@/lib/timezone";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import FlagFont from "@/components/FlagFont";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mundial 2026 — Calendario y Eliminatorias",
  description:
    "Calendario completo, fases de grupos y eliminatorias del Mundial 2026. Schedule, group standings and knockout bracket for the 2026 World Cup.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mundial 2026",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a7d52",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider>
          <TimezoneProvider>
            <Header />
            <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
              {children}
            </main>
            <Footer />
          </TimezoneProvider>
        </I18nProvider>
        <ServiceWorkerRegister />
        <FlagFont />
      </body>
    </html>
  );
}
