import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Respuestas de error con forma uniforme.
 *
 * El status code es la parte importante: es lo que leen los clientes, los caches y
 * los monitores. El body sirve para que un humano entienda qué pasó.
 */

export function errorValidacion(error: ZodError) {
  return NextResponse.json(
    { error: "Datos inválidos", detalles: error.flatten() },
    { status: 400 },
  );
}

export function noAutenticado() {
  return NextResponse.json(
    { error: "Falta autenticación" },
    { status: 401 },
  );
}

export function sinPermiso(detalle: string) {
  return NextResponse.json({ error: detalle }, { status: 403 });
}

export function noEncontrado(detalle = "El recurso no existe") {
  return NextResponse.json({ error: detalle }, { status: 404 });
}

export function conflicto(detalle: string) {
  return NextResponse.json({ error: detalle }, { status: 409 });
}
