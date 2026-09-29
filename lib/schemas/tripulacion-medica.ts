import { z } from "zod";
import { idSchema } from "./comun";

/**
 * La tripulación no pertenece a una solicitud: se asigna a muchas a través de
 * AsignacionTripulacion (N-N). Por eso no tiene `solicitudId`.
 */
export const tripulacionMedicaSchema = z.object({
  id: idSchema,
  patenteAmbulancia: z.string().trim().min(6, "La patente debe tener al menos 6 caracteres").max(10, "La patente no puede superar 10 caracteres"),
  paramedicoResponsable: z.string().trim().min(3, "El nombre necesita al menos 3 caracteres").max(100, "El nombre no puede superar los 100 caracteres"),
  estado: z.enum(["EN_BASE", "EN_TRANSITO_ORIGEN", "EN_TRANSITO_DESTINO", "REGRESANDO"]),
});

/** Tabla intermedia de la N-N SolicitudTraslado ↔ TripulacionMedica. */
export const asignacionTripulacionSchema = z.object({
  solicitudId: idSchema,
  tripulacionMedicaId: idSchema,
  asignadaEn: z.coerce.date({ invalid_type_error: "Formato de fecha inválido" }),
});

export type TripulacionMedica = z.infer<typeof tripulacionMedicaSchema>;
export type AsignacionTripulacion = z.infer<typeof asignacionTripulacionSchema>;
