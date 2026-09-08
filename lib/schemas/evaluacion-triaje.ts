import { z } from "zod";

export const evaluacionTriajeSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
  solicitudId: z.string().uuid("El ID de la solicitud debe ser válido"),
  frecuenciaCardiaca: z.number().int().min(0, "No puede ser menor a 0").max(300, "Valor fuera de rango clínico (máximo 300)"),
  presionSistolica: z.number().int().min(0, "No puede ser menor a 0").max(300, "Presión sistólica inválida (máximo 300)"),
  presionDiastolica: z.number().int().min(0, "No puede ser menor a 0").max(200, "Presión diastólica inválida (máximo 200)"),
  nivelUrgenciaSugerido: z.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]),
});

export type EvaluacionTriaje = z.infer<typeof evaluacionTriajeSchema>;