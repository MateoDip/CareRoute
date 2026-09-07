import { z } from "zod";

export const centroSaludSchema = z.object({
  id: z.string().uuid("El ID debe ser un UUID válido"),
  nombre: z.string().trim().min(3, "El nombre necesita al menos 3 caracteres").max(100, "El nombre no puede superar los 100 caracteres"),
  nivelComplejidad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
  ubicacion: z.string().trim().min(5, "La ubicación es obligatoria").max(200, "La ubicación es demasiado larga"),
});

export type CentroSalud = z.infer<typeof centroSaludSchema>;