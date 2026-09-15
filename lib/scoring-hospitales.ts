import type { NivelUrgencia, TipoUnidad } from "@prisma/client";

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
 * TODO (clase 5): incorporar la distancia real al centro de origen. Hoy
 * `CentroSalud.ubicacion` es texto libre ("Pellegrini 3205"), no coordenadas, así
 * que no hay forma de calcularla. Falta una migración que agregue latitud y
 * longitud antes de poder implementarlo.
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
