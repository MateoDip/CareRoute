import type { UsuarioSesion } from "@/lib/auth";
import { existeCentro, fijarCamasDelCentro } from "@/lib/db/centros";
import type { CamasPorTipo } from "@/lib/schemas/unidad-cuidados";
import { exito, rechazo, type Resultado } from "./resultado";

type CamasFijadas = Awaited<ReturnType<typeof fijarCamasDelCentro>>;

/**
 * Corrección a mano de las camas libres de un centro (HU05, regla 7).
 *
 * Las camas cambian solas con las derivaciones (aprobar, pase de unidad, alta),
 * pero el hospital también interna pacientes que no llegan por CareRoute: por
 * eso el receptor puede corregir las de su centro, y el admin las de cualquiera.
 * Para el receptor, otro centro "no existe" (404), como en PATCH /api/unidades.
 */
export async function fijarCamas(
  usuario: UsuarioSesion,
  centroSaludId: string,
  camas: CamasPorTipo,
): Promise<Resultado<CamasFijadas>> {
  if (usuario.rol !== "ADMIN" && usuario.centroSaludId !== centroSaludId) {
    return rechazo("NO_ENCONTRADA", "El centro de salud no existe");
  }
  if (!(await existeCentro(centroSaludId))) {
    return rechazo("CENTRO_INEXISTENTE", "El centro de salud no existe");
  }

  return exito(await fijarCamasDelCentro(centroSaludId, camas));
}
