"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirAdminEnPagina } from "@/lib/auth";
import { crearCentro } from "@/lib/casos/crear-centro";
import { editarCentro } from "@/lib/casos/editar-centro";
import { eliminarCentro } from "@/lib/casos/eliminar-centro";
import { fijarCamas } from "@/lib/casos/fijar-camas";
import {
  camasDe,
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  opcionDe,
  valoresDe,
  type EstadoFormulario,
} from "@/lib/formularios";
import { datosCentroSchema } from "@/lib/schemas/centro-salud";
import { camasPorTipoSchema } from "@/lib/schemas/unidad-cuidados";

/**
 * Alta, edición y baja de centros desde el panel. Mismo camino que
 * POST/PATCH/DELETE /api/centros: sesión de ADMIN en la primera línea, el schema
 * de Zod existente y el caso de uso. El id del centro llega por .bind.
 *
 * La edición manda los tres campos, así que usa `datosCentroSchema` (todos
 * obligatorios) y no el del PATCH, donde son opcionales. Las camas se validan
 * con `camasPorTipoSchema`, el mismo que usa el body de POST /api/centros.
 */

function datosDelCentro(formData: FormData) {
  return datosCentroSchema.safeParse(
    {
      nombre: opcionDe(formData, "nombre"),
      nivelComplejidad: opcionDe(formData, "nivelComplejidad"),
      ubicacion: opcionDe(formData, "ubicacion"),
    },
    { errorMap: mensajesEnCastellano },
  );
}

function revalidarCentros() {
  revalidatePath("/admin");
  revalidatePath("/admin/centros");
}

export async function crearCentroAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirAdminEnPagina();

  // Datos y camas se validan los dos antes de responder: todos los errores juntos.
  const datos = datosDelCentro(formData);
  const camas = camasPorTipoSchema.safeParse(camasDe(formData), { errorMap: mensajesEnCastellano });
  if (!datos.success || !camas.success) {
    return {
      errores: {
        ...(datos.success ? {} : datos.error.flatten().fieldErrors),
        ...(camas.success ? {} : camas.error.flatten().fieldErrors),
      },
      valores: valoresDe(formData),
    };
  }

  const resultado = await crearCentro({ ...datos.data, camas: camas.data });
  if (!resultado.ok) return estadoDeRechazo(resultado, formData);

  revalidarCentros();
  redirect("/admin/centros");
}

export async function editarCentroAction(
  centroId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirAdminEnPagina();

  const datos = datosDelCentro(formData);
  if (!datos.success) return estadoDeValidacion(datos.error, formData);

  const resultado = await editarCentro(centroId, datos.data);
  if (!resultado.ok) return estadoDeRechazo(resultado, formData);

  revalidarCentros();
  redirect("/admin/centros");
}

export async function eliminarCentroAction(
  centroId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirAdminEnPagina();

  const resultado = await eliminarCentro(centroId);
  if (!resultado.ok) return estadoDeRechazo(resultado, formData);

  revalidarCentros();
  redirect("/admin/centros");
}

/** Corrección a mano de las camas de cualquier centro (HU05, regla 7). */
export async function fijarCamasAction(
  centroId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await requerirAdminEnPagina();

  const camas = camasPorTipoSchema.safeParse(camasDe(formData), { errorMap: mensajesEnCastellano });
  if (!camas.success) return estadoDeValidacion(camas.error, formData);

  const resultado = await fijarCamas(admin, centroId, camas.data);
  if (!resultado.ok) return estadoDeRechazo(resultado, formData);

  revalidarCentros();
  redirect("/admin/centros");
}
