"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirAdminEnPagina } from "@/lib/auth";
import { crearCentro } from "@/lib/casos/crear-centro";
import { editarCentro } from "@/lib/casos/editar-centro";
import { eliminarCentro } from "@/lib/casos/eliminar-centro";
import {
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  opcionDe,
  type EstadoFormulario,
} from "@/lib/formularios";
import { crearCentroSchema } from "@/lib/schemas/centro-salud";

/**
 * Alta, edición y baja de centros desde el panel. Mismo camino que
 * POST/PATCH/DELETE /api/centros: sesión de ADMIN en la primera línea, el schema
 * de Zod existente y el caso de uso. El id del centro llega por .bind.
 *
 * La edición manda los tres campos, así que usa el schema del alta (todos
 * obligatorios) y no el del PATCH, donde son opcionales.
 */

function datosDelCentro(formData: FormData) {
  return crearCentroSchema.safeParse(
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

  const datos = datosDelCentro(formData);
  if (!datos.success) return estadoDeValidacion(datos.error, formData);

  const resultado = await crearCentro(datos.data);
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
