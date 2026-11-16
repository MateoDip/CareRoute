import { contarDependenciasDelCentro, eliminarCentro as borrarCentro } from "@/lib/db/centros";
import { impedimentoParaEliminarCentro } from "@/lib/reglas-admin";
import { exito, rechazo, type Resultado } from "./resultado";

/**
 * Baja de un centro (ADMIN, spec §3 y regla 5).
 *
 * Con usuarios o derivaciones vinculados no se puede (Restrict): el rechazo
 * lleva las cantidades, para que el admin sepa qué resolver antes. Unidades y
 * recursos se borran en cascada con el centro.
 */
export async function eliminarCentro(centroId: string): Promise<Resultado<null>> {
  const dependencias = await contarDependenciasDelCentro(centroId);
  if (!dependencias) return rechazo("NO_ENCONTRADA", "El centro de salud no existe");

  const impedimento = impedimentoParaEliminarCentro(dependencias);
  if (impedimento) {
    return rechazo(
      "CENTRO_CON_DEPENDENCIAS",
      "No se puede dar de baja un centro con usuarios o derivaciones. Reasigná a sus usuarios primero; el historial de derivaciones no se borra.",
      { dependencias: impedimento },
    );
  }

  // false: le vincularon algo entre el conteo y el borrado (la base lo frenó).
  const eliminado = await borrarCentro(centroId);
  if (!eliminado) {
    return rechazo(
      "CENTRO_CON_DEPENDENCIAS",
      "El centro cambió mientras se procesaba: ahora tiene usuarios o derivaciones",
    );
  }

  return exito(null);
}
