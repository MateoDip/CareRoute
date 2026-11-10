"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { elegirDestino } from "@/lib/casos/elegir-destino";
import {
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  opcionDe,
  type EstadoFormulario,
} from "@/lib/formularios";
import { asignarDestinoSchema } from "@/lib/schemas/solicitud-traslado";

/**
 * HU04 — el derivante confirma el centro de destino elegido del ranking.
 *
 * El id de la solicitud sale de la URL (.bind). El centro de destino sí viene del
 * formulario: es la decisión del médico, y el caso de uso vuelve a verificar que
 * exista y tenga cama del tipo requerido. Mismo caso que POST /destino.
 */
export async function elegirDestinoAction(
  solicitudId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirMedicoEnPagina("MEDICO_DERIVANTE");

  const datos = asignarDestinoSchema.safeParse(
    { centroDestinoId: opcionDe(formData, "centroDestinoId") },
    { errorMap: mensajesEnCastellano },
  );
  if (!datos.success) return estadoDeValidacion(datos.error, formData);

  const resultado = await elegirDestino(usuario, solicitudId, datos.data.centroDestinoId);
  if (!resultado.ok) {
    // Sin cama en ese centro (caso de error de HU04): se recarga el ranking, que
    // ya no lo va a ofrecer, y el mensaje queda arriba para elegir otro.
    if (resultado.motivo === "CAPACIDAD_AGOTADA") {
      revalidatePath(`/solicitudes/${solicitudId}/destino`);
    }
    return estadoDeRechazo(resultado, formData);
  }

  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/");
  redirect(`/solicitudes/${solicitudId}`);
}
