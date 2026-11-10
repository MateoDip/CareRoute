"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { registrarTriaje } from "@/lib/casos/registrar-triaje";
import {
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  numeroDe,
  opcionDe,
  valoresDe,
  type EstadoFormulario,
} from "@/lib/formularios";
import { crearEvaluacionSchema } from "@/lib/schemas/evaluacion-triaje";

/**
 * HU02 — registrar el triaje desde la pantalla.
 *
 * El id de la solicitud sale de la URL y llega fijado con .bind (no viaja en un
 * input oculto que se pueda editar). Mismo caso de uso que
 * POST /api/solicitudes/:id/evaluacion.
 *
 * Si la IA no responde (502 en la API), no se guarda nada y el formulario vuelve
 * con los signos vitales cargados y el campo de nivel marcado: el médico lo elige
 * y reenvía (caso de error de HU02).
 */
export async function registrarTriajeAction(
  solicitudId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requerirMedicoEnPagina("MEDICO_DERIVANTE");

  const datos = crearEvaluacionSchema.safeParse(
    {
      frecuenciaCardiaca: numeroDe(formData, "frecuenciaCardiaca"),
      presionSistolica: numeroDe(formData, "presionSistolica"),
      presionDiastolica: numeroDe(formData, "presionDiastolica"),
      // Vacío = "que lo sugiera la IA".
      nivelUrgenciaSugerido: opcionDe(formData, "nivelUrgenciaSugerido"),
    },
    { errorMap: mensajesEnCastellano },
  );
  if (!datos.success) return estadoDeValidacion(datos.error, formData);

  const resultado = await registrarTriaje(usuario, solicitudId, datos.data);
  if (!resultado.ok) {
    if (resultado.motivo === "IA_NO_DISPONIBLE") {
      return {
        error:
          "La IA no respondió a tiempo y no se guardó nada. Elegí el nivel de urgencia vos y volvé a guardar.",
        errores: {
          nivelUrgenciaSugerido: ["Elegí un nivel: la sugerencia de la IA no está disponible."],
        },
        valores: valoresDe(formData),
      };
    }
    return estadoDeRechazo(resultado, formData);
  }

  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/");
  redirect(`/solicitudes/${solicitudId}`);
}
