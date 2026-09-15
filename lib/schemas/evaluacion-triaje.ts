import { z } from "zod";

export const nivelUrgenciaSchema = z.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]);

/**
 * Body de POST /api/solicitudes/:id/evaluacion.
 *
 * Los rangos son los del signo vital plausible en un paciente vivo. Sirven para
 * atajar errores de tipeo, no para diagnosticar.
 */
export const crearEvaluacionSchema = z.object({
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
  nivelUrgenciaSugerido: nivelUrgenciaSchema,
});

export type CrearEvaluacion = z.infer<typeof crearEvaluacionSchema>;
