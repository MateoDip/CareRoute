import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El build falla si hay errores de tipos o de lint. Es a propósito:
  // preferimos enterarnos en el Pull Request y no en producción.
  typescript: { ignoreBuildErrors: false },
  // Las pruebas e2e compilan en .next-e2e (NEXT_DIST_DIR en .env.e2e): las
  // variables NEXT_PUBLIC_ quedan fijadas en el build, y el de las pruebas no
  // tiene que pisar al de `npm run dev` ni al revés.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
