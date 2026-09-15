import { NextResponse } from "next/server";
import { actualizarUnidad, obtenerUnidad } from "@/lib/db/centros";
import {
  errorValidacion,
  noAutenticado,
  noEncontrado,
  sinPermiso,
} from "@/lib/http";
import { actualizarUnidadSchema } from "@/lib/schemas/unidad-cuidados";
import { getSesion } from "@/lib/sesion";

type Contexto = { params: Promise<{ id: string }> };

/**
 * PATCH /api/unidades/:id — actualiza las camas disponibles (HU05).
 *
 * PATCH y no PUT: PUT significaría "este es el recurso completo, reemplazalo", y
 * obligaría al cliente a mandar también `tipo` y `centroSaludId` en cada cambio de
 * cama. Con dos personas editando a la vez, la segunda pisaría los datos de la
 * primera. PATCH toca solo lo que se envía.
 *
 * La unidad tiene id propio y cuelga de un solo centro, así que no hace falta
 * anidarla bajo /api/centros/:id/unidades/:unidadId — eso serían dos niveles, y la
 * regla de la clase es uno como máximo.
 */
export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const datos = actualizarUnidadSchema.safeParse(body);
  if (!datos.success) return errorValidacion(datos.error);

  const sesion = await getSesion(request);
  if (!sesion) return noAutenticado();

  const unidad = await obtenerUnidad(id);
  if (!unidad) return noEncontrado("La unidad no existe");

  // La unidad es de otro centro: 404, no 403. No se confirma que el id sea real.
  if (unidad.centroSaludId !== sesion.centroSaludId) {
    return noEncontrado("La unidad no existe");
  }

  // Acá sí 403: el usuario sabe que la unidad existe (es de su centro), lo que le
  // falta es el rol.
  if (sesion.rol !== "ADMIN" && sesion.rol !== "MEDICO_RECEPTOR") {
    return sinPermiso("No tenés permiso para actualizar la disponibilidad");
  }

  const actualizada = await actualizarUnidad(id, datos.data);
  return NextResponse.json(actualizada, { status: 200 });
}
