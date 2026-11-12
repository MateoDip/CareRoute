import { defineConfig, devices } from "@playwright/test";
import { cargarEntornoE2E, variable } from "./e2e/entorno";

/**
 * Pruebas e2e (clase 13): flujo principal, permisos y concurrencia.
 *
 *   npm run test:e2e                  todas (Docker con Postgres encendido)
 *   npm run test:e2e -- permisos      solo un archivo
 *   npx playwright test --ui          verlas en vivo
 *   npx playwright show-trace <zip>   abrir el trace de una falla
 *
 * Nunca contra producción: `cargarEntornoE2E` lee .env.e2e y corta acá mismo si
 * la base no es local.
 */
const entorno = cargarEntornoE2E();
const puerto = variable(entorno, "PUERTO_E2E");
const urlApp = `http://127.0.0.1:${puerto}`;
const urlAuth = variable(entorno, "NEXT_PUBLIC_SUPABASE_URL");

export default defineConfig({
  testDir: "./e2e",
  // Una sola base para todas: las pruebas corren de a una, en orden.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // Sin reintentos: una prueba intermitente se arregla, no se repite hasta que pase.
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/preparar.ts",
  use: {
    baseURL: urlApp,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    // Al fallar guarda pasos, pantallas, red y consola (npx playwright show-trace).
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Supabase Auth de pruebas: verifica la firma de los tokens (ADR 0009).
      command: "npx tsx e2e/auth-local.ts",
      url: `${urlAuth}/auth/v1/health`,
      env: entorno,
      reuseExistingServer: !process.env.CI,
    },
    {
      // La app compilada, como en producción, con su propio distDir (.next-e2e).
      command: `npx next build && npx next start -p ${puerto}`,
      url: `${urlApp}/ingresar`,
      env: entorno,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
