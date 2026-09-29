import { z } from "zod";
import { idSchema } from "./comun";

export const registroBitacoraSchema = z.object({
  id: idSchema,
  solicitudId: idSchema,
  tripulacionMedicaId: idSchema.optional(),
  fechaHora: z.coerce.date({
    required_error: "La fecha y hora son obligatorias",
    invalid_type_error: "Formato de fecha inválido",
  }),
  evento: z.enum(["SALIDA_BASE", "LLEGADA_ORIGEN", "PACIENTE_A_BORDO", "LLEGADA_DESTINO", "COMPLICACION_CLINICA"]),
  observaciones: z.string().trim().max(500, "Las observaciones no pueden superar los 500 caracteres").optional(),
});

export type RegistroBitacora = z.infer<typeof registroBitacoraSchema>;
