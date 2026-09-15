import { NextResponse } from "next/server";
import {
  ESTADOS_EDITABLES,
  actualizarSolicitud,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import {
  conflicto,
  errorValidacion,
  noAutenticado,
  noEncontrado,
  sinPermiso,
} from "@/lib/http";
import { actualizarSolicitudSchema } from "@/lib/schemas/solicitud-traslado";
import { getSesion } from "@/lib/sesion";

/**
 * En Next.js 15 y posteriores, `params` es una Promise: hay que esperarla.
 * Es el cambio que más rompe código copiado de tutoriales viejos.
 */
type Contexto = { params: Promise<{ id: string }> };

/** GET /api/solicitudes/:id — ficha de la solicitud con su evaluación de triaje. */
export async function GET(request: Request, { params }: Contexto) {
  const { id } = await params;

  const sesion = await getSesion(request);
  if (!sesion) return noAutenticado();

  const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
  // null puede significar "no existe" o "es de otro centro". Las dos devuelven 404
  // a propósito: un 403 confirmaría que el id es real.
  if (!solicitud) return noEncontrado("La solicitud no existe");

  return NextResponse.json(solicitud, { status: 200 });
}

/** PATCH /api/solicitudes/:id — corrige datos mientras la solicitud sea editable. */
export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const datos = actualizarSolicitudSchema.safeParse(body);
  if (!datos.success) return errorValidacion(datos.error);

  const sesion = await getSesion(request);
  if (!sesion) return noAutenticado();

  const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
  if (!solicitud) return noEncontrado("La solicitud no existe");

  // Acá sí corresponde 403 y no 404: el usuario ya sabe que la solicitud existe
  // porque su centro está involucrado. Lo que le falta es el permiso.
  if (sesion.rol !== "MEDICO_DERIVANTE") {
    return sinPermiso("Solo un médico derivante puede corregir la solicitud");
  }
  if (solicitud.centroOrigenId !== sesion.centroSaludId) {
    return sinPermiso("Solo el centro de origen puede corregir la solicitud");
  }

  // Existe, el body está bien y hay permiso — lo que falla es el estado: 409.
  if (!ESTADOS_EDITABLES.includes(solicitud.estado)) {
    return conflicto(
      `No se puede modificar una solicitud en estado ${solicitud.estado}`,
    );
  }

  const actualizada = await actualizarSolicitud(id, datos.data);
  return NextResponse.json(actualizada, { status: 200 });
}
