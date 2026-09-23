import type { NivelUrgencia, TipoUnidad } from "@prisma/client";
import { centrosElegibles, type UnidadDisponible } from "./disponibilidad";

/**
 * Reglas de negocio del ranking de hospitales (HU03).
 *
 * Vive en lib/ y no en app/: no sabe nada de HTTP, recibe datos y devuelve datos.
 * Eso la hace testeable sin levantar el servidor.
 */

/** Qué tipo de cama necesita un paciente según su nivel de urgencia. */
export function unidadRequerida(urgencia: NivelUrgencia): TipoUnidad {
  switch (urgencia) {
    case "CRITICO":
    case "ALTO":
      return "UTI";
    case "MEDIO":
      return "UCO";
    case "BAJO":
      return "SALA_COMUN";
  }
}

export type CentroCandidato = {
  id: string;
  nombre: string;
  ubicacion: string;
  nivelComplejidad: string;
  camasDisponibles: number;
  recursosOperativos: number;
};

/**
 * Puntaje de un centro candidato.
 *
 * La distancia al centro de origen no entra en el puntaje: `CentroSalud.ubicacion`
 * es texto libre, no coordenadas. Postergado hasta la migración que agregue
 * latitud y longitud — ver docs/adr/0002-reglas-que-esperan-una-migracion.md.
 */
export function calcularPuntaje(centro: CentroCandidato): number {
  const puntosPorCamas = Math.min(centro.camasDisponibles, 10) * 10;
  const puntosPorRecursos = Math.min(centro.recursosOperativos, 5) * 5;

  const puntosPorComplejidad =
    centro.nivelComplejidad === "CRITICA"
      ? 20
      : centro.nivelComplejidad === "ALTA"
        ? 15
        : centro.nivelComplejidad === "MEDIA"
          ? 10
          : 5;

  return puntosPorCamas + puntosPorRecursos + puntosPorComplejidad;
}

export type CentroConUnidades = {
  id: string;
  nombre: string;
  ubicacion: string;
  nivelComplejidad: string;
  unidades: readonly UnidadDisponible[];
  recursosOperativos: number;
};

/**
 * Ranking de candidatos para una derivación (HU03).
 *
 * Filtra con la misma regla de capacidad que usa la aprobación
 * (`centrosElegibles`) y ordena por puntaje. Así lo que el ranking ofrece y lo
 * que la aprobación acepta no pueden divergir: es una sola función.
 */
export function rankearCandidatos(
  centros: readonly CentroConUnidades[],
  tipoRequerido: TipoUnidad,
  centroOrigenId: string,
): Array<CentroCandidato & { puntaje: number }> {
  return centrosElegibles(centros, tipoRequerido, centroOrigenId)
    .map((centro) => {
      const candidato: CentroCandidato = {
        id: centro.id,
        nombre: centro.nombre,
        ubicacion: centro.ubicacion,
        nivelComplejidad: centro.nivelComplejidad,
        camasDisponibles: centro.unidades
          .filter((unidad) => unidad.tipo === tipoRequerido)
          .reduce((total, unidad) => total + unidad.camasDisponibles, 0),
        recursosOperativos: centro.recursosOperativos,
      };
      return { ...candidato, puntaje: calcularPuntaje(candidato) };
    })
    .sort((a, b) => b.puntaje - a.puntaje);
}
