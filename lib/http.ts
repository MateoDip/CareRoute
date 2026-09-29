import { NextResponse } from "next/server";
import type { TipoUnidad } from "@prisma/client";
import type { ZodError } from "zod";

/**
 * Respuestas de error con forma uniforme.
 *
 * El status code es la parte importante: es lo que leen los clientes, los caches y
 * los monitores. El body sirve para que un humano entienda qué pasó.
 *
 * 401, 403 por rol y 500 no están acá: salen de las excepciones de lib/auth.ts y
 * los traduce `responderError` (lib/errores.ts), en el catch de cada handler.
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

export function sinPermiso(detalle: string, datos?: Record<string, unknown>) {
  return NextResponse.json({ error: detalle, ...datos }, { status: 403 });
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
 * 409 de capacidad (caso de error de HU04). Lleva los tipos que sí tienen
 * cama como array aparte: la pantalla los necesita para recargar el ranking.
 */
export function capacidadAgotada(
  tipoRequerido: TipoUnidad,
  tiposLibres: readonly TipoUnidad[],
) {
  return conflicto(
    `Capacidad agotada: el centro de destino no tiene camas ${tipoRequerido} disponibles`,
    { tipoRequerido, tiposConCamaLibre: tiposLibres },
  );
}

/**
 * 502: el request y el estado están bien, pero un servicio externo del que depende
 * la operación no respondió (clase 7). No es 500 porque no es un bug nuestro, y no
 * es 409 porque reintentar más tarde puede funcionar.
 *
 * El mensaje dice qué hacer, no solo qué pasó: el usuario tiene que poder seguir.
 */
export function falloExterno(detalle: string, datos?: Record<string, unknown>) {
  return NextResponse.json({ error: detalle, ...datos }, { status: 502 });
}
