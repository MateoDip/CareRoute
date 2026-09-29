import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { crearCentro, listarCentros } from "@/lib/db/centros";
import { responderError } from "@/lib/errores";
import { errorValidacion } from "@/lib/http";
import { crearCentroSchema } from "@/lib/schemas/centro-salud";

/**
 * GET /api/centros — catálogo de centros con unidades y recursos (HU05).
 * Cualquier usuario logueado, tenga o no centro: es información de la red.
 */
export async function GET() {
  try {
    await requerirUsuario();
    const centros = await listarCentros();
    return NextResponse.json(centros, { status: 200 });
  } catch (error) {
    return responderError("GET /api/centros", error);
  }
}

/** POST /api/centros — alta de un centro de salud (solo ADMIN, spec §2). */
export async function POST(request: Request) {
  try {
    await requerirUsuario("ADMIN");

    const body: unknown = await request.json().catch(() => null);
    const datos = crearCentroSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    const centro = await crearCentro(datos.data);
    return NextResponse.json(centro, { status: 201 });
  } catch (error) {
    return responderError("POST /api/centros", error);
  }
}
