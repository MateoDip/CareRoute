import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import {
  actualizarCentro,
  contarDependenciasDelCentro,
  eliminarCentro,
  obtenerCentro,
} from "@/lib/db/centros";
import { responderError } from "@/lib/errores";
import { conflicto, errorValidacion, noEncontrado } from "@/lib/http";
import { impedimentoParaEliminarCentro } from "@/lib/reglas-admin";
import { actualizarCentroSchema } from "@/lib/schemas/centro-salud";

type Contexto = { params: Promise<{ id: string }> };

/**
 * CentroSalud es la entidad con CRUD completo del proyecto:
 * GET/POST /api/centros y GET/PATCH/DELETE /api/centros/:id.
 */

/** GET /api/centros/:id — ficha del centro. Cualquier usuario logueado. */
export async function GET(_request: Request, { params }: Contexto) {
  try {
    await requerirUsuario();
    const { id } = await params;

    const centro = await obtenerCentro(id);
    if (!centro) return noEncontrado("El centro de salud no existe");

    return NextResponse.json(centro, { status: 200 });
  } catch (error) {
    return responderError("GET /api/centros/:id", error);
  }
}

/** PATCH /api/centros/:id — edita nombre, complejidad o ubicación (ADMIN). */
export async function PATCH(request: Request, { params }: Contexto) {
  try {
    await requerirUsuario("ADMIN");
    const { id } = await params;

    const body: unknown = await request.json().catch(() => null);
    const datos = actualizarCentroSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    const centro = await actualizarCentro(id, datos.data);
    if (!centro) return noEncontrado("El centro de salud no existe");

    return NextResponse.json(centro, { status: 200 });
  } catch (error) {
    return responderError("PATCH /api/centros/:id", error);
  }
}

/**
 * DELETE /api/centros/:id — baja de un centro (ADMIN, spec §3).
 *
 * Con usuarios o solicitudes vinculados no se puede (Restrict): 409 con las
 * cantidades, para que el admin sepa qué resolver antes. Unidades y recursos se
 * borran en cascada con el centro.
 */
export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    await requerirUsuario("ADMIN");
    const { id } = await params;

    const dependencias = await contarDependenciasDelCentro(id);
    if (!dependencias) return noEncontrado("El centro de salud no existe");

    const impedimento = impedimentoParaEliminarCentro(dependencias);
    if (impedimento) {
      return conflicto(
        "No se puede dar de baja un centro con usuarios o derivaciones. Reasigná a sus usuarios primero; el historial de derivaciones no se borra.",
        { dependencias: impedimento },
      );
    }

    // false: le vincularon algo entre el conteo y el borrado (la base lo frenó).
    const eliminado = await eliminarCentro(id);
    if (!eliminado) {
      return conflicto(
        "El centro cambió mientras se procesaba: ahora tiene usuarios o derivaciones",
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return responderError("DELETE /api/centros/:id", error);
  }
}
