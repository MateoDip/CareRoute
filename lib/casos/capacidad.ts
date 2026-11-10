import type { TipoUnidad } from "@prisma/client";
import { rechazo, type Rechazo } from "./resultado";

/**
 * Caso de error de HU04: el destino no tiene cama del tipo requerido. Lleva
 * aparte los tipos que sí tienen cama, para que la pantalla recargue el ranking.
 */
export function capacidadAgotada(
  tipoRequerido: TipoUnidad,
  tiposLibres: readonly TipoUnidad[],
): Rechazo {
  return rechazo(
    "CAPACIDAD_AGOTADA",
    `Capacidad agotada: el centro de destino no tiene camas ${tipoRequerido} disponibles`,
    { tipoRequerido, tiposConCamaLibre: tiposLibres },
  );
}
