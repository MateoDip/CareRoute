import { z } from "zod";

export const unidadCuidadosSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
  centroSaludId: z.string().uuid("El ID del centro debe ser válido"),
  tipo: z.enum(["UTI", "UCO", "SALA_COMUN", "GUARDIA"]),
  camasDisponibles: z.number().int("Debe ser un número entero").min(0, "La cantidad de camas no puede ser negativa"),
});

export type UnidadCuidados = z.infer<typeof unidadCuidadosSchema>;