"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { aprobarDerivacion } from "@/lib/casos/aprobar-derivacion";
import { finalizarTraslado } from "@/lib/casos/finalizar-traslado";
import { iniciarTraslado } from "@/lib/casos/iniciar-traslado";
import { rechazarDerivacion } from "@/lib/casos/rechazar-derivacion";
import { estadoDeRechazo, type EstadoFormulario } from "@/lib/formularios";

/**
 * Las operaciones de la ficha que no llevan campos (HU04, HU07 y regla 3 de la spec).
 * El id sale de la URL (.bind); el rol y el lado los vuelve a verificar el caso
 * de uso, aunque la ficha solo muestre el botón a quien corresponde.
 */

export async function aprobarAction(
  solicitudId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirMedicoEnPagina("MEDICO_RECEPTOR");

  const resultado = await aprobarDerivacion(usuario, solicitudId);
  if (!resultado.ok) {
    revalidatePath(`/solicitudes/${solicitudId}`);
    return estadoDeRechazo(resultado, formData);
  }

  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/");
  redirect(`/solicitudes/${solicitudId}`);
}

export async function rechazarAction(
  solicitudId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // Rechazan los dos roles clínicos, cada uno desde su lado (lo decide el caso).
  const usuario = await requerirMedicoEnPagina();

  const resultado = await rechazarDerivacion(usuario, solicitudId);
  if (!resultado.ok) {
    revalidatePath(`/solicitudes/${solicitudId}`);
    return estadoDeRechazo(resultado, formData);
  }

  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/");
  redirect(`/solicitudes/${solicitudId}`);
}

export async function iniciarTrasladoAction(
  solicitudId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // La salida del paciente la marca el centro de origen (ADR 0011).
  const usuario = await requerirMedicoEnPagina("MEDICO_DERIVANTE");

  const resultado = await iniciarTraslado(usuario, solicitudId);
  if (!resultado.ok) {
    revalidatePath(`/solicitudes/${solicitudId}`);
    return estadoDeRechazo(resultado, formData);
  }

  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/");
  redirect(`/solicitudes/${solicitudId}`);
}

export async function finalizarTrasladoAction(
  solicitudId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // La llegada del paciente la marca el centro de destino (ADR 0011).
  const usuario = await requerirMedicoEnPagina("MEDICO_RECEPTOR");

  const resultado = await finalizarTraslado(usuario, solicitudId);
  if (!resultado.ok) {
    revalidatePath(`/solicitudes/${solicitudId}`);
    return estadoDeRechazo(resultado, formData);
  }

  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/");
  redirect(`/solicitudes/${solicitudId}`);
}
