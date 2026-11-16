import { actualizarCentro } from "@/lib/db/centros";
import type { ActualizarCentro } from "@/lib/schemas/centro-salud";
import { exito, rechazo, type Resultado } from "./resultado";

type CentroEditado = NonNullable<Awaited<ReturnType<typeof actualizarCentro>>>;

/** Edita nombre, complejidad o ubicación de un centro (ADMIN, spec §2). */
export async function editarCentro(
  centroId: string,
  datos: ActualizarCentro,
): Promise<Resultado<CentroEditado>> {
  const centro = await actualizarCentro(centroId, datos);
  if (!centro) return rechazo("NO_ENCONTRADA", "El centro de salud no existe");
  return exito(centro);
}
