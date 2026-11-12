import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

/**
 * El entorno de las pruebas e2e (clase 13), leído de `.env.e2e`.
 *
 * Se usa en tres lugares: playwright.config.ts (para la app y el servidor de Auth
 * local), e2e/preparar.ts (para Prisma) y las pruebas (para las sesiones).
 *
 * Los valores de `.env.e2e` le ganan a los de la terminal y a los de .env.local:
 * una variable de producción exportada en la terminal no puede colarse en una
 * corrida de pruebas.
 */
export type EntornoE2E = Record<string, string>;

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Las pruebas borran y vuelven a crear la base. Contra producción serían un
 * desastre: si DATABASE_URL o DIRECT_URL no apuntan a esta máquina, se cortan.
 */
export function exigirBaseLocal(entorno: EntornoE2E): void {
  for (const variable of ["DATABASE_URL", "DIRECT_URL"]) {
    const valor = entorno[variable];
    if (!valor) {
      throw new Error(`.env.e2e: falta ${variable}.`);
    }
    let host: string;
    try {
      host = new URL(valor).hostname;
    } catch {
      throw new Error(`.env.e2e: ${variable} no es una URL de Postgres válida.`);
    }
    if (!HOSTS_LOCALES.has(host)) {
      throw new Error(
        `Las pruebas e2e solo corren contra una base local. ${variable} apunta a "${host}". ` +
          "Nunca contra producción: revisá .env.e2e.",
      );
    }
  }
}

export function cargarEntornoE2E(): EntornoE2E {
  const archivo = path.join(process.cwd(), ".env.e2e");
  const entorno = parse(readFileSync(archivo));
  exigirBaseLocal(entorno);
  return entorno;
}

/** Una variable obligatoria del entorno de pruebas. */
export function variable(entorno: EntornoE2E, nombre: string): string {
  const valor = entorno[nombre];
  if (!valor) throw new Error(`.env.e2e: falta ${nombre}.`);
  return valor;
}
