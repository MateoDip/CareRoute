import { z } from "zod";

export const tripulacionMedicaSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
  solicitudId: z.string().uuid("El ID de la solicitud debe ser válido"),
  patenteAmbulancia: z.string().trim().min(6, "La patente debe tener al menos 6 caracteres").max(10, "La patente no puede superar 10 caracteres"),
  paramedicoResponsable: z.string().trim().min(3, "El nombre necesita al menos 3 caracteres").max(100, "El nombre no puede superar los 100 caracteres"),
  estado: z.enum(["EN_BASE", "EN_TRANSITO_ORIGEN", "EN_TRANSITO_DESTINO", "REGRESANDO"]),
});

export type TripulacionMedica = z.infer<typeof tripulacionMedicaSchema>;