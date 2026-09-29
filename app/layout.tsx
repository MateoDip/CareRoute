import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareRoute",
  description: "Coordinación inter-hospitalaria y triaje de traslados críticos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
