import { z } from "zod";
import { idSchema } from "./comun";

export const rolUsuarioSchema = z.enum(["ADMIN", "MEDICO_DERIVANTE", "MEDICO_RECEPTOR"]);

/**
 * Body de PATCH /api/usuarios/:id — solo lo usa un ADMIN (spec §2).
 *
 * Es el único lugar donde un rol viaja en un body, y está bien: no es la persona
 * diciendo qué rol TIENE, es un admin (verificado por sesión) asignándolo.
 * `centroSaludId: null` le quita el centro.
 */
export const actualizarUsuarioSchema = z
  .object({
    rol: rolUsuarioSchema,
    centroSaludId: idSchema.nullable(),
  })
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Hay que enviar al menos un campo para modificar",
  });

export type ActualizarUsuario = z.infer<typeof actualizarUsuarioSchema>;
