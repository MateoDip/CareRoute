"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { fijarCamas } from "@/lib/casos/fijar-camas";
import {
  camasDe,
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  type EstadoFormulario,
} from "@/lib/formularios";
import { camasPorTipoSchema } from "@/lib/schemas/unidad-cuidados";

/**
 * El receptor corrige las camas libres de su centro (HU05, regla 7). El centro
 * sale de la sesión: el formulario solo manda los cuatro números.
 */
export async function fijarCamasDelReceptorAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirMedicoEnPagina("MEDICO_RECEPTOR");

  const camas = camasPorTipoSchema.safeParse(camasDe(formData), { errorMap: mensajesEnCastellano });
  if (!camas.success) return estadoDeValidacion(camas.error, formData);

  const resultado = await fijarCamas(usuario, usuario.centroSaludId, camas.data);
  if (!resultado.ok) return estadoDeRechazo(resultado, formData);

  revalidatePath("/camas");
  redirect("/camas?guardado=1");
}
