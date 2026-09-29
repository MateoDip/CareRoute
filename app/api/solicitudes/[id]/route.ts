import { NextResponse } from "next/server";
import { ROLES_CLINICOS, requerirUsuarioConCentro } from "@/lib/auth";
import {
  actualizarSolicitudPendiente,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import { responderError } from "@/lib/errores";
import { conflicto, errorValidacion, noEncontrado } from "@/lib/http";
import { puedeEditarse } from "@/lib/reglas-solicitud";
import { actualizarSolicitudSchema } from "@/lib/schemas/solicitud-traslado";

/** En Next.js 15+ `params` es una Promise: hay que esperarla. */
type Contexto = { params: Promise<{ id: string }> };

/** GET /api/solicitudes/:id — ficha con su triaje y tripulaciones (HU07). */
export async function GET(_request: Request, { params }: Contexto) {
  try {
    const usuario = await requerirUsuarioConCentro(ROLES_CLINICOS);
    const { id } = await params;

    // null = no existe o no es de su centro: 404 en los dos casos, a propósito.
    const solicitud = await obtenerSolicitudDelCentro(id, usuario.centroSaludId);
    if (!solicitud) return noEncontrado("La solicitud no existe");

    return NextResponse.json(solicitud, { status: 200 });
  } catch (error) {
    return responderError("GET /api/solicitudes/:id", error);
  }
}

/** PATCH /api/solicitudes/:id — corrige el DNI mientras siga PENDIENTE. */
export async function PATCH(request: Request, { params }: Contexto) {
  try {
    // 1-2. SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_DERIVANTE");
    const { id } = await params;

    // 3. PERTENENCIA → 404. Solo el centro de origen la corrige.
    const solicitud = await obtenerSolicitudDelCentro(
      id,
      usuario.centroSaludId,
      "origen",
    );
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // 4. BODY → 400
    const body: unknown = await request.json().catch(() => null);
    const datos = actualizarSolicitudSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    // 5. REGLA → 409
    if (!puedeEditarse(solicitud.estado)) {
      return conflicto("Solo se pueden corregir solicitudes pendientes", {
        estadoActual: solicitud.estado,
      });
    }

    // 6. DELEGAR — condicional: si justo la evaluaron, no se pisa.
    const actualizada = await actualizarSolicitudPendiente({
      id,
      centroOrigenId: usuario.centroSaludId,
      datos: datos.data,
    });
    if (!actualizada) {
      return conflicto("La solicitud cambió de estado mientras se procesaba");
    }
    return NextResponse.json(actualizada, { status: 200 });
  } catch (error) {
    return responderError("PATCH /api/solicitudes/:id", error);
  }
}
