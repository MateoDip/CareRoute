import { NextResponse } from "next/server";
import { listarCentros } from "@/lib/db/centros";
import { errorInterno, noAutenticado } from "@/lib/http";
import { getSesion } from "@/lib/sesion";

/**
 * GET /api/centros — catálogo de centros con sus unidades y recursos.
 *
 * A diferencia del ranking de candidatos, este recurso existe por sí solo: un
 * hospital tiene sentido con o sin derivaciones en curso. Es el insumo de HU05.
 */
export async function GET(request: Request) {
  try {
    const sesion = await getSesion(request);
    if (!sesion) return noAutenticado();

    const centros = await listarCentros();
    return NextResponse.json(centros, { status: 200 });
  } catch (error) {
    return errorInterno("GET /api/centros", error);
  }
}
