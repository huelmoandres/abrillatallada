import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { StructuredData } from "@/components/structured-data";
import { siteMetadata } from "@/lib/seo";
import "./globals.css";

const bodoni = localFont({
  src: "./fonts/bodoni-moda.ttf",
  variable: "--font-bodoni",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const dmSans = localFont({
  src: "./fonts/dm-sans.ttf",
  variable: "--font-dm-sans",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = siteMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-UY" className={`${bodoni.variable} ${dmSans.variable}`}>
      <body>
        <a className="skip-link" href="#contenido">Ir al contenido</a>
        <div id="inicio" className="page-start" aria-hidden="true" />
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
