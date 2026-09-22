import type { TipoUnidad } from "@prisma/client";

/**
 * Reglas de capacidad de camas (spec §6, H3).
 *
 * Vive en lib/ y no en lib/db/: no importa Prisma ni Next, no lee la base y no
 * mira el reloj. Recibe datos, devuelve datos. Se prueba llamándola.
 */

export type UnidadDisponible = {
  id: string;
  tipo: TipoUnidad;
  camasDisponibles: number;
};

/**
 * La unidad del tipo requerido que tiene al menos una cama libre, o null.
 *
 * Devuelve la unidad completa y no un booleano porque quien aprueba necesita el
 * `id` para reservar la cama: con un true/false habría que volver a buscarla.
 */
export function unidadConCamaLibre(
  unidades: readonly UnidadDisponible[],
  tipoRequerido: TipoUnidad,
): UnidadDisponible | null {
  return (
    unidades.find(
      (unidad) => unidad.tipo === tipoRequerido && unidad.camasDisponibles > 0,
    ) ?? null
  );
}

/**
 * Los tipos de unidad que sí tienen cama libre en ese centro.
 *
 * Es el dato estructurado del 409: "no hay UTI, pero sí UCO" le sirve al médico
 * para decidir, mientras que "capacidad agotada" a secas lo deja sin opciones.
 */
export function tiposConCamaLibre(
  unidades: readonly UnidadDisponible[],
): TipoUnidad[] {
  return unidades
    .filter((unidad) => unidad.camasDisponibles > 0)
    .map((unidad) => unidad.tipo);
}

export type CentroConCapacidad = {
  id: string;
  unidades: readonly UnidadDisponible[];
};

/**
 * Los centros que pueden recibir al paciente (criterio de aceptación de H3:
 * solo se muestran los que tienen cama del tipo requerido).
 *
 * El centro de origen se excluye: derivar a uno mismo no es una derivación.
 */
export function centrosElegibles<T extends CentroConCapacidad>(
  centros: readonly T[],
  tipoRequerido: TipoUnidad,
  centroOrigenId: string,
): T[] {
  return centros.filter(
    (centro) =>
      centro.id !== centroOrigenId &&
      unidadConCamaLibre(centro.unidades, tipoRequerido) !== null,
  );
}
