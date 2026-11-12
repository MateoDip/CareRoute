import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { MotivoDeRechazo, Rechazo } from "@/lib/casos/resultado";

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
 * Qué status lleva cada motivo de rechazo de un caso de uso (clase 12).
 *
 * Es un Record y no un switch con default: si se agrega un motivo en
 * lib/casos/resultado.ts, el typecheck falla hasta que alguien decida su código.
 *
 *  - 404: no existe o no es de su lado (no se distingue: un 403 confirmaría el id).
 *  - 403: una regla de dominio le niega la acción a su rol sobre un dato suyo.
 *  - 409: el pedido está bien, pero el estado del sistema no lo admite.
 *  - 502: el servicio externo del que depende la operación no respondió (clase 7).
 */
export const STATUS_POR_MOTIVO: Record<MotivoDeRechazo, number> = {
  NO_ENCONTRADA: 404,
  CENTRO_INEXISTENTE: 404,
  ROL_NO_HABILITADO: 403,
  ESTADO_INCOMPATIBLE: 409,
  YA_EVALUADA: 409,
  FALTA_TRIAJE: 409,
  DESTINO_IGUAL_A_ORIGEN: 409,
  CAPACIDAD_AGOTADA: 409,
  CAMBIO_CONCURRENTE: 409,
  DERIVACION_ABIERTA: 409,
  IA_NO_DISPONIBLE: 502,
};

/** El rechazo de un caso de uso como respuesta HTTP: mensaje en `error`, datos aparte. */
export function responderRechazo(rechazo: Rechazo) {
  return NextResponse.json(
    { error: rechazo.mensaje, ...rechazo.datos },
    { status: STATUS_POR_MOTIVO[rechazo.motivo] },
  );
}
