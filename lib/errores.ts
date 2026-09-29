import { NextResponse } from "next/server";
import { NoAutenticado, NoAutorizado, SinCentroAsignado } from "@/lib/auth";

/**
 * Traduce las excepciones que llegan al `catch` de un handler (clase 6).
 *
 * Solo tres son esperadas, y las lanza lib/auth.ts. Todo lo demás es un bug o
 * una caída (base, red): se loguea con el endpoint y se responde 500 sin
 * detalles, porque un mensaje de Prisma revela tablas, columnas y hasta el SQL.
 */
export function responderError(endpoint: string, error: unknown) {
  if (error instanceof NoAutenticado) {
    return NextResponse.json(
      { error: "Falta autenticación. Iniciá sesión y volvé a intentar." },
      { status: 401 },
    );
  }

  if (error instanceof SinCentroAsignado) {
    return NextResponse.json(
      {
        error:
          "Tu usuario todavía no tiene un centro de salud asignado. Pedíselo a un administrador.",
      },
      { status: 403 },
    );
  }

  if (error instanceof NoAutorizado) {
    return NextResponse.json(
      {
        error: "No podés realizar esta operación con tu rol",
        rolesHabilitados: error.rolesHabilitados,
      },
      { status: 403 },
    );
  }

  console.error(endpoint, error);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
