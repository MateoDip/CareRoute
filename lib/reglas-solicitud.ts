import type { EstadoSolicitud, RolUsuario } from "@prisma/client";

/**
 * Reglas de ciclo de vida de una SolicitudTraslado.
 *
 * La máquina de estados de docs/api.md, escrita una sola vez y en un lugar donde
 * se puede probar sin levantar el servidor. No importa Prisma ni Next.
 */

/** Qué estados se pueden alcanzar desde cada estado. */
const TRANSICIONES: Record<EstadoSolicitud, readonly EstadoSolicitud[]> = {
  PENDIENTE: ["EVALUANDO", "RECHAZADA"],
  EVALUANDO: ["APROBADA", "RECHAZADA"],
  APROBADA: ["EN_CURSO", "RECHAZADA"],
  EN_CURSO: ["FINALIZADA"],
  RECHAZADA: [],
  FINALIZADA: [],
};

/**
 * Los estados a los que se puede pasar desde `estado`.
 *
 * Devuelve la lista y no un booleano porque el 409 la enumera: decirle al cliente
 * "no se puede" sin decirle qué sí se puede lo obliga a adivinar.
 */
export function transicionesPosibles(
  estado: EstadoSolicitud,
): EstadoSolicitud[] {
  return [...TRANSICIONES[estado]];
}

export function puedeTransicionar(
  desde: EstadoSolicitud,
  hacia: EstadoSolicitud,
): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/** Estados desde los que ya no sale ninguna transición. */
export function esTerminal(estado: EstadoSolicitud): boolean {
  return TRANSICIONES[estado].length === 0;
}

/**
 * PATCH solo mientras la solicitud está PENDIENTE (docs/api.md).
 *
 * Una vez que hay una evaluación de triaje, corregir los datos de filiación
 * dejaría la evaluación describiendo a otro paciente.
 */
export function puedeEditarse(estado: EstadoSolicitud): boolean {
  return estado === "PENDIENTE";
}

/**
 * Quién puede rechazar la solicitud desde cada estado (spec §6).
 *
 * Regla del dominio: una solicitud ya APROBADA por el receptor no puede ser
 * cancelada unilateralmente por el emisor — el hospital de destino ya reservó la
 * cama y preparó el equipo. Antes de la aprobación, cualquiera de los dos puede
 * echarse atrás.
 *
 * Devuelve la lista de roles habilitados, para que el 403 pueda nombrarlos.
 */
export function rolesQuePuedenRechazar(
  estado: EstadoSolicitud,
): RolUsuario[] {
  if (!puedeTransicionar(estado, "RECHAZADA")) return [];
  if (estado === "APROBADA") return ["MEDICO_RECEPTOR"];
  return ["MEDICO_DERIVANTE", "MEDICO_RECEPTOR"];
}

/**
 * Por qué no se puede aprobar una solicitud, o null si nada lo impide (HU04).
 *
 * Devuelve el motivo con sus datos y no un booleano: cada motivo es un 409 con un
 * mensaje distinto, y el de estado tiene que enumerar las transiciones posibles.
 * La falta de triaje y de camas se chequean aparte: la primera es un dato que
 * puede no existir y la segunda vive en lib/disponibilidad.ts.
 */
export type ImpedimentoAprobacion =
  | {
      motivo: "ESTADO_INCOMPATIBLE";
      estadoActual: EstadoSolicitud;
      transicionesPosibles: EstadoSolicitud[];
    }
  | { motivo: "DESTINO_IGUAL_A_ORIGEN" };

export function impedimentoParaAprobar(params: {
  estado: EstadoSolicitud;
  centroOrigenId: string;
  centroDestinoId: string;
}): ImpedimentoAprobacion | null {
  if (!puedeTransicionar(params.estado, "APROBADA")) {
    return {
      motivo: "ESTADO_INCOMPATIBLE",
      estadoActual: params.estado,
      transicionesPosibles: transicionesPosibles(params.estado),
    };
  }
  if (params.centroOrigenId === params.centroDestinoId) {
    return { motivo: "DESTINO_IGUAL_A_ORIGEN" };
  }
  return null;
}

/**
 * Si al rechazar hay que devolver la cama al centro de destino.
 *
 * Solo una solicitud APROBADA tiene cama reservada: la aprobación la descontó.
 * Antes de eso no hay nada que devolver.
 */
export function liberaCamaAlRechazar(estado: EstadoSolicitud): boolean {
  return estado === "APROBADA";
}
