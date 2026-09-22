import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Respuestas de error con forma uniforme.
 *
 * El status code es la parte importante: es lo que leen los clientes, los caches y
 * los monitores. El body sirve para que un humano entienda qué pasó.
 *
 * Toda respuesta de error tiene dos audiencias: la persona, que lee `error`, y el
 * programa, que necesita el status y el dato estructurado para decidir qué hacer.
 */

export function errorValidacion(error: ZodError) {
  return NextResponse.json(
    { error: "Datos inválidos", detalles: error.flatten() },
    { status: 400 },
  );
}

export function noAutenticado() {
  return NextResponse.json({ error: "Falta autenticación" }, { status: 401 });
}

export function sinPermiso(detalle: string) {
  return NextResponse.json({ error: detalle }, { status: 403 });
}

export function noEncontrado(detalle = "El recurso no existe") {
  return NextResponse.json({ error: detalle }, { status: 404 });
}

/**
 * 409: el request está bien formado, pero el estado del sistema no lo admite.
 *
 * `datos` va aparte del mensaje y no embutido en el texto: el criterio de
 * aceptación que pide enumerar (los tipos de cama libres, las transiciones
 * posibles) necesita un array que la pantalla pueda recorrer, no castellano
 * que tenga que parsear.
 */
export function conflicto(detalle: string, datos?: Record<string, unknown>) {
  return NextResponse.json({ error: detalle, ...datos }, { status: 409 });
}

/**
 * 500: solo llega acá lo que no se previó. El detalle va al log del servidor,
 * nunca al cliente — un mensaje de Prisma revela tablas, columnas y a veces el SQL.
 */
export function errorInterno(contexto: string, error: unknown) {
  console.error(contexto, error);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
