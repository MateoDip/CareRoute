import { z } from "zod";
import { idSchema } from "./comun";

export const recursoEspecializadoSchema = z.object({
  id: idSchema,
  centroSaludId: idSchema,
  tipo: z.enum(["RESPIRADOR", "MONITOR_MULTIPARAMETRICO", "DESFIBRILADOR", "BOMBA_INFUSION"]),
  estado: z.enum(["OPERATIVO", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO"]),
  ultimaRevision: z.coerce.date({
    required_error: "La fecha de revisión es obligatoria",
    invalid_type_error: "Debe ser una fecha válida",
  }),
});

export type RecursoEspecializado = z.infer<typeof recursoEspecializadoSchema>;
