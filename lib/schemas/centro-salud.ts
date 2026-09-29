import { z } from "zod";
import { idSchema } from "./comun";

export const nivelComplejidadSchema = z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]);

/** Body de POST /api/centros (ADMIN). El id lo genera la base. */
export const crearCentroSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre necesita al menos 3 caracteres")
    .max(100, "El nombre no puede superar los 100 caracteres"),
  nivelComplejidad: nivelComplejidadSchema,
  ubicacion: z
    .string()
    .trim()
    .min(5, "La ubicación necesita al menos 5 caracteres")
    .max(200, "La ubicación no puede superar los 200 caracteres"),
});

/** Body de PATCH /api/centros/:id (ADMIN): los mismos campos, todos opcionales. */
export const actualizarCentroSchema = crearCentroSchema
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Hay que enviar al menos un campo para modificar",
  });

/** Representación completa de un centro ya persistido. */
export const centroSaludSchema = crearCentroSchema.extend({ id: idSchema });

export type CrearCentro = z.infer<typeof crearCentroSchema>;
export type ActualizarCentro = z.infer<typeof actualizarCentroSchema>;
export type CentroSalud = z.infer<typeof centroSaludSchema>;
