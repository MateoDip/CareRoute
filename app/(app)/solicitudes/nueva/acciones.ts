"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { iniciarSolicitud } from "@/lib/casos/iniciar-solicitud";
import {
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  opcionDe,
  type EstadoFormulario,
} from "@/lib/formularios";
import { crearSolicitudSchema } from "@/lib/schemas/solicitud-traslado";

/**
 * HU01 — iniciar una solicitud desde la pantalla.
 *
 * Mismo camino que POST /api/solicitudes: sesión y rol en la primera línea, el
 * schema de Zod existente y el caso de uso de lib/casos/. El centro de origen
 * sale de la sesión: el formulario solo manda el DNI.
 */
export async function iniciarSolicitudAction(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirMedicoEnPagina("MEDICO_DERIVANTE");

  const datos = crearSolicitudSchema.safeParse(
    // Vacío → undefined, así el mensaje es "Completá este campo" y no el del formato.
    { pacienteDni: opcionDe(formData, "pacienteDni")?.trim() || undefined },
    { errorMap: mensajesEnCastellano },
  );
  if (!datos.success) return estadoDeValidacion(datos.error, formData);

  const resultado = await iniciarSolicitud(usuario, datos.data);
  if (!resultado.ok) {
    // Regla 6: el paciente ya tiene una derivación abierta. Se lo lleva a esa.
    const abierta = resultado.datos?.solicitudAbiertaId;
    return {
      ...estadoDeRechazo(resultado, formData),
      enlace:
        typeof abierta === "string"
          ? { href: `/solicitudes/${abierta}`, texto: "Ver la derivación abierta" }
          : undefined,
    };
  }

  const id = resultado.valor.id;
  revalidatePath(`/solicitudes/${id}`);
  revalidatePath("/");
  redirect(`/solicitudes/${id}`);
}
