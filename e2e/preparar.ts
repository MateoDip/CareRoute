import { execFileSync } from "node:child_process";
import { cargarEntornoE2E } from "./entorno";

/**
 * Antes de todas las pruebas (globalSetup de playwright.config.ts): deja la base
 * local igual que la primera vez.
 *
 * `prisma migrate reset` borra la base, aplica las migraciones de
 * prisma/migrations y corre el seed (prisma/seed.ts) con los mails de
 * SEED_EMAIL_* de .env.e2e. Así cada corrida empieza del mismo estado, aunque
 * la anterior haya aprobado o rechazado solicitudes.
 *
 * Antes de borrar nada, `cargarEntornoE2E` vuelve a comprobar que la base sea
 * local. Es la segunda barrera: la primera está en playwright.config.ts.
 */
export default function preparar() {
  const entorno = cargarEntornoE2E();

  execFileSync("npx", ["prisma", "migrate", "reset", "--force"], {
    stdio: "inherit",
    env: { ...process.env, ...entorno },
  });
}
