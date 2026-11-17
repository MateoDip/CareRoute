import type { EstadoSolicitud, TipoUnidad } from "@prisma/client";

/**
 * Regla 7 de la spec §6: la cama del paciente en el centro de destino.
 *
 * La cama se reserva al aprobar la derivación (HU04) y el paciente la ocupa
 * hasta que el receptor le da el alta. Mientras está internado, el receptor
 * puede pasarlo a otra unidad: libera la cama que ocupa y toma una de otro tipo.
 * Las dos operaciones son solo con la derivación FINALIZADA (el paciente ya
 * llegó): antes, la cama está reservada, no ocupada.
 *
 * Funciones puras: sin Prisma ni Next. El caso de uso las llama y la base
 * cumple lo que depende del momento (camas libres, cambios simultáneos).
 */

export type Internacion = {
  estado: EstadoSolicitud;
  /** El tipo de la unidad que ocupa hoy, o null si no ocupa ninguna. */
  tipoOcupado: TipoUnidad | null;
  fechaAlta: Date | null;
};

/** ¿El paciente de esta derivación está internado en el destino? */
export function estaInternado(internacion: Internacion): boolean {
  return (
    internacion.estado === "FINALIZADA" &&
    internacion.tipoOcupado !== null &&
    internacion.fechaAlta === null
  );
}

/** Por qué no se le puede dar el alta, o null. */
export function impedimentoParaAlta(internacion: Internacion): "NO_INTERNADO" | null {
  return estaInternado(internacion) ? null : "NO_INTERNADO";
}

/** Por qué no se lo puede pasar a una unidad de este tipo, o null. */
export function impedimentoParaCambioDeUnidad(
  internacion: Internacion,
  tipoNuevo: TipoUnidad,
): "NO_INTERNADO" | "MISMA_UNIDAD" | null {
  if (!estaInternado(internacion)) return "NO_INTERNADO";
  if (internacion.tipoOcupado === tipoNuevo) return "MISMA_UNIDAD";
  return null;
}
