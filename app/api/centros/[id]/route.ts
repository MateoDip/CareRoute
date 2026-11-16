import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { editarCentro } from "@/lib/casos/editar-centro";
import { eliminarCentro } from "@/lib/casos/eliminar-centro";
import { obtenerCentro } from "@/lib/db/centros";
import { responderError } from "@/lib/errores";
import { errorValidacion, noEncontrado, responderRechazo } from "@/lib/http";
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

    const resultado = await editarCentro(id, datos.data);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
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

    // Inexistente (404) o con usuarios o derivaciones (409 con las cantidades):
    // lib/casos/eliminar-centro.ts, que también usa la pantalla /admin/centros/:id.
    const resultado = await eliminarCentro(id);
    if (!resultado.ok) return responderRechazo(resultado);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return responderError("DELETE /api/centros/:id", error);
  }
}
