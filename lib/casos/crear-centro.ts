import { crearCentro as guardarCentro } from "@/lib/db/centros";
import type { CrearCentro } from "@/lib/schemas/centro-salud";
import { exito, type Resultado } from "./resultado";

type CentroCreado = Awaited<ReturnType<typeof guardarCentro>>;

/**
 * Alta de un centro de salud (ADMIN, spec §2). No tiene reglas más allá del
 * schema; es un caso igual para que la API y la pantalla escriban por el mismo
 * camino (AGENTS.md §2.5.1).
 */
export async function crearCentro(datos: CrearCentro): Promise<Resultado<CentroCreado>> {
  return exito(await guardarCentro(datos));
}
