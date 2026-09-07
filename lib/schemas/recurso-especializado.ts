import { z } from "zod";

export const recursoEspecializadoSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
  centroSaludId: z.string().uuid("El ID del centro debe ser válido"),
  tipo: z.enum(["RESPIRADOR", "MONITOR_MULTIPARAMETRICO", "DESFIBRILADOR", "BOMBA_INFUSION"]),
  estado: z.enum(["OPERATIVO", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO"]),
  ultimaRevision: z.coerce.date({
    required_error: "La fecha de revisión es obligatoria",
    invalid_type_error: "Debe ser una fecha válida",
  }),
});

export type RecursoEspecializado = z.infer<typeof recursoEspecializadoSchema>;