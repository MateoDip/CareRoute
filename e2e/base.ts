import { PrismaClient } from "@prisma/client";
import { cargarEntornoE2E, variable } from "./entorno";

/**
 * La base local de las pruebas, para CONTAR lo que quedó guardado (clase 14).
 *
 * Solo lectura: las pruebas escriben a través de la app, como una persona, y
 * miran la base para comprobar lo que la app no muestra (cuántas filas hay de
 * verdad). Es la única excepción a "Prisma solo desde lib/db/" y vive fuera de
 * la app. `cargarEntornoE2E` vuelve a comprobar que la base sea local.
 */
export function baseDePruebas(): PrismaClient {
  const entorno = cargarEntornoE2E();
  return new PrismaClient({ datasourceUrl: variable(entorno, "DATABASE_URL") });
}
