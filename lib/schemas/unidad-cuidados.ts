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

/** Camas libres de un tipo: entero, de cero en adelante (caso de error de HU05). */
const camasSchema = z
  .number()
  .int("Debe ser un número entero")
  .min(0, "No puede haber menos de cero camas")
  .max(500, "Valor implausible para una unidad");

/**
 * Las camas libres de cada tipo de unidad de un centro: lo carga el admin al dar
 * de alta el centro y lo corrigen después el receptor (su centro) o el admin
 * (regla 7, HU05). Cuatro números, uno por tipo.
 */
export const camasPorTipoSchema = z.object({
  UTI: camasSchema,
  UCO: camasSchema,
  SALA_COMUN: camasSchema,
  GUARDIA: camasSchema,
});

export type CamasPorTipo = z.infer<typeof camasPorTipoSchema>;

/** Body de POST /api/solicitudes/:id/cambio-de-unidad: a qué tipo de unidad pasa el paciente. */
export const cambioDeUnidadSchema = z.object({ tipo: tipoUnidadSchema });

export type CambioDeUnidad = z.infer<typeof cambioDeUnidadSchema>;
