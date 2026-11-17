"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { aprobarDerivacion } from "@/lib/casos/aprobar-derivacion";
import { pasarAOtraUnidad } from "@/lib/casos/cambiar-de-unidad";
import { darDeAltaAlPaciente } from "@/lib/casos/dar-de-alta";
import { finalizarTraslado } from "@/lib/casos/finalizar-traslado";
import { iniciarTraslado } from "@/lib/casos/iniciar-traslado";
import { rechazarDerivacion } from "@/lib/casos/rechazar-derivacion";
import {
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  opcionDe,
  type EstadoFormulario,
} from "@/lib/formularios";
import { cambioDeUnidadSchema } from "@/lib/schemas/unidad-cuidados";

/**
 * Las operaciones de la ficha (HU04, HU07 y reglas 3 y 7 de la spec). Todas sin
 * campos, salvo el pase de unidad, que lleva el tipo de unidad nuevo.
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

export async function darDeAltaAction(
  solicitudId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // El alta la da el centro de destino, que es donde está internado (regla 7).
  const usuario = await requerirMedicoEnPagina("MEDICO_RECEPTOR");

  const resultado = await darDeAltaAlPaciente(usuario, solicitudId);
  if (!resultado.ok) {
    revalidatePath(`/solicitudes/${solicitudId}`);
    return estadoDeRechazo(resultado, formData);
  }

  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/");
  redirect(`/solicitudes/${solicitudId}`);
}

/** Pase de unidad (regla 7): el único campo es el tipo de unidad nuevo. */
export async function cambiarDeUnidadAction(
  solicitudId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirMedicoEnPagina("MEDICO_RECEPTOR");

  const datos = cambioDeUnidadSchema.safeParse(
    { tipo: opcionDe(formData, "tipo") },
    { errorMap: mensajesEnCastellano },
  );
  if (!datos.success) return estadoDeValidacion(datos.error, formData);

  const resultado = await pasarAOtraUnidad(usuario, solicitudId, datos.data.tipo);
  if (!resultado.ok) {
    revalidatePath(`/solicitudes/${solicitudId}`);
    return estadoDeRechazo(resultado, formData);
  }

  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/");
  redirect(`/solicitudes/${solicitudId}`);
}
