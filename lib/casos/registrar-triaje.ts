import type { UsuarioConCentro } from "@/lib/auth";
import {
  obtenerSolicitudDelCentro,
  registrarEvaluacion,
} from "@/lib/db/solicitudes";
import { puedeTransicionar, transicionesPosibles } from "@/lib/reglas-solicitud";
import {
  nivelUrgenciaSchema,
  type CrearEvaluacion,
} from "@/lib/schemas/evaluacion-triaje";
import { sugerirNivelUrgencia } from "@/lib/servicios/openai";
import { exito, rechazo, type Resultado } from "./resultado";

type EvaluacionRegistrada = NonNullable<
  Awaited<ReturnType<typeof registrarEvaluacion>>
>;

/**
 * HU02 — triaje de la solicitud, con el nivel sugerido por la IA o elegido a mano.
 *
 * Servicio externo ESENCIAL (spec §8): sin nivel no hay evaluación que guardar,
 * así que se llama a OpenAI antes de escribir y, si falla, no se guarda nada.
 * Se llama después de las reglas: no se gasta una consulta en una solicitud que
 * igual se iba a rechazar. La IA sugiere; el médico puede elegir el nivel.
 */
export async function registrarTriaje(
  usuario: UsuarioConCentro,
  solicitudId: string,
  datos: CrearEvaluacion,
): Promise<Resultado<EvaluacionRegistrada>> {
  // El triaje lo registra el centro de origen.
  const solicitud = await obtenerSolicitudDelCentro(
    solicitudId,
    usuario.centroSaludId,
    "origen",
  );
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  if (solicitud.evaluacionTriaje) {
    return rechazo("YA_EVALUADA", "La solicitud ya fue evaluada", {
      estadoActual: solicitud.estado,
    });
  }
  if (!puedeTransicionar(solicitud.estado, "EVALUANDO")) {
    return rechazo(
      "ESTADO_INCOMPATIBLE",
      "La solicitud no puede evaluarse en este estado",
      {
        estadoActual: solicitud.estado,
        transicionesPosibles: transicionesPosibles(solicitud.estado),
      },
    );
  }

  const { nivelUrgenciaSugerido: nivelManual, ...signos } = datos;
  const nivel = nivelManual ?? (await sugerirNivelUrgencia(signos, solicitudId));
  if (!nivel) {
    return rechazo(
      "IA_NO_DISPONIBLE",
      "No pudimos obtener la sugerencia de urgencia: el servicio de IA no respondió. Elegí el nivel manualmente y volvé a enviar la evaluación.",
      {
        ingresoManualRequerido: true,
        nivelesPosibles: nivelUrgenciaSchema.options,
      },
    );
  }

  // null: otro médico la evaluó entre la lectura y la escritura.
  const evaluacion = await registrarEvaluacion(solicitudId, {
    ...signos,
    nivelUrgenciaSugerido: nivel,
    origenNivel: nivelManual ? "MANUAL" : "IA",
  });
  if (!evaluacion) {
    return rechazo("YA_EVALUADA", "La solicitud ya fue evaluada", {
      estadoActual: "EVALUANDO",
    });
  }

  return exito(evaluacion);
}
