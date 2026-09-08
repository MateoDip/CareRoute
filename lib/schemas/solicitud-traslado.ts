import { z } from "zod";

export const solicitudTrasladoSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
  centroOrigenId: z.string().uuid("El ID del centro origen debe ser válido"),
  centroDestinoId: z.string().uuid("El ID del centro destino debe ser válido").optional(), 
  pacienteDni: z.string().trim().min(7, "El DNI debe tener al menos 7 números").max(10, "El DNI no puede superar los 10 números"),
  estado: z.enum(["PENDIENTE", "EVALUANDO", "APROBADA", "RECHAZADA", "EN_CURSO", "FINALIZADA"]),
  fechaSolicitud: z.coerce.date({
    required_error: "La fecha de solicitud es obligatoria",
    invalid_type_error: "Formato de fecha inválido",
  }),
});

export type SolicitudTraslado = z.infer<typeof solicitudTrasladoSchema>;