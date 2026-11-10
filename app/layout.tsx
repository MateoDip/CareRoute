import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareRoute",
  description: "Coordinación inter-hospitalaria y triaje de traslados críticos",
};

/**
 * Layout raíz: idioma y tipografía. La fuente es la del sistema (font-sans de
 * Tailwind): no se descarga nada y en el teléfono se lee como el resto de apps.
 * Cada grupo de rutas, (app) y (public), trae su propio encabezado.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
