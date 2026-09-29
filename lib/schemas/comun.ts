import { z } from "zod";

/**
 * Los ids los genera Prisma con `cuid()`, no son UUID. Validarlos con `.uuid()`
 * rechazaría el 100% de los ids reales. Se valida forma, no formato.
 */
export const idSchema = z
  .string()
  .trim()
  .min(1, "El ID es obligatorio")
  .max(64, "El ID es demasiado largo");
