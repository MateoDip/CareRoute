import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareRoute",
  description: "Coordinación inter-hospitalaria y triaje de traslados críticos",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b151c" },
  ],
};

/**
 * Atkinson Hyperlegible Next: la diseñó el Braille Institute para que cada
 * carácter se distinga de los parecidos (0 y O, 1, l e I). En CareRoute se leen
 * DNI y signos vitales en un teléfono, con apuro: es la razón de la elección.
 *
 * Va dentro del repo (app/fuentes/, licencia OFL) y la sirve Next con
 * next/font/local: no se pide nada a Google ni a otro servidor, y no es una
 * dependencia de npm.
 */
const hiperlegible = localFont({
  src: "./fuentes/atkinson-hyperlegible-next.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--fuente-hiperlegible",
});

/**
 * Layout raíz: idioma y tipografía. Cada grupo de rutas, (app) y (public), trae
 * su propio encabezado.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={hiperlegible.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
