import { z } from "zod";

export const tipoUnidadSchema = z.enum(["UTI", "UCO", "SALA_COMUN", "GUARDIA"]);

/**
 * Body de PATCH /api/unidades/:id.
 *
 * `camasDisponibles` no puede ser negativo: un hospital no tiene menos de cero
 * camas. La base no lo impide (INTEGER acepta negativos), así que lo frena Zod.
 */
export const actualizarUnidadSchema = z
  .object({
    camasDisponibles: z
      .number()
      .int("Debe ser un número entero")
      .min(0, "No puede haber menos de cero camas")
      .max(500, "Valor implausible para una unidad"),
  })
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Hay que enviar al menos un campo para modificar",
  });

export type ActualizarUnidad = z.infer<typeof actualizarUnidadSchema>;
