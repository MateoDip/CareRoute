import { z } from "zod";

export const nivelUrgenciaSchema = z.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]);

/**
 * Signos vitales de una evaluación de triaje.
 *
 * Los rangos son los del signo vital plausible en un paciente vivo. Sirven para
 * atajar errores de tipeo, no para diagnosticar.
 */
export const signosVitalesSchema = z.object({
  frecuenciaCardiaca: z
    .number()
    .int("Debe ser un número entero")
    .min(20, "Frecuencia cardíaca fuera de rango")
    .max(250, "Frecuencia cardíaca fuera de rango"),
  presionSistolica: z
    .number()
    .int("Debe ser un número entero")
    .min(40, "Presión sistólica fuera de rango")
    .max(300, "Presión sistólica fuera de rango"),
  presionDiastolica: z
    .number()
    .int("Debe ser un número entero")
    .min(20, "Presión diastólica fuera de rango")
    .max(200, "Presión diastólica fuera de rango"),
});

/**
 * Body de POST /api/solicitudes/:id/evaluacion.
 *
 * `nivelUrgenciaSugerido` es opcional (clase 7, HU02):
 *  - si NO viene, el servidor se lo pide a la IA (lib/servicios/openai.ts);
 *  - si viene, es el ingreso manual del médico — el camino que indica HU02 cuando
 *    la IA falla o tarda más de 10 segundos — y no se llama a la IA.
 */
export const crearEvaluacionSchema = signosVitalesSchema.extend({
  nivelUrgenciaSugerido: nivelUrgenciaSchema.optional(),
});

export type NivelUrgencia = z.infer<typeof nivelUrgenciaSchema>;
export type SignosVitales = z.infer<typeof signosVitalesSchema>;
export type CrearEvaluacion = z.infer<typeof crearEvaluacionSchema>;

/** Lo que se guarda: los signos vitales más un nivel ya resuelto (IA o manual). */
export type EvaluacionAGuardar = SignosVitales & {
  nivelUrgenciaSugerido: NivelUrgencia;
};
