import type {
  EstadoSolicitud,
  OrigenNivelUrgencia,
  Prisma,
  TipoUnidad,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ActualizarSolicitud,
  CrearSolicitud,
} from "@/lib/schemas/solicitud-traslado";
import type { EvaluacionAGuardar } from "@/lib/schemas/evaluacion-triaje";

/**
 * Capa de consultas de SolicitudTraslado.
 *
 * Reglas que se respetan acá:
 *  - Este archivo no conoce el objeto Request. Recibe datos, devuelve datos.
 *  - La pertenencia se resuelve en el `where` (clase 6): toda consulta que
 *    devuelve una solicitud recibe el centro del usuario de la sesión. Si no es
 *    suya, devuelve null y el handler responde 404 — nunca un `if` en route.ts.
 *  - Todo listado lleva `take` y todo `select` es explícito: lo que no se
 *    selecciona no se puede filtrar por accidente. Hay datos de pacientes.
 *  - Las escrituras que dependen del estado son condicionales (`updateMany` con
 *    el estado esperado en el `where`): si otro usuario cambió la solicitud en el
 *    medio, no se pisa nada y se devuelve null.
 */

const LIMITE_LISTADO = 50;

const camposSolicitud = {
  id: true,
  centroOrigenId: true,
  centroDestinoId: true,
  pacienteDni: true,
  estado: true,
  fechaSolicitud: true,
  fechaAprobacion: true,
} satisfies Prisma.SolicitudTrasladoSelect;

const camposEvaluacion = {
  id: true,
  frecuenciaCardiaca: true,
  presionSistolica: true,
  presionDiastolica: true,
  nivelUrgenciaSugerido: true,
  origenNivel: true,
} satisfies Prisma.EvaluacionTriajeSelect;

/** Desde qué lado de la derivación mira el usuario. */
export type LadoDerivacion = "cualquiera" | "origen" | "destino";

function filtroPorLado(
  centroSaludId: string,
  lado: LadoDerivacion,
): Prisma.SolicitudTrasladoWhereInput {
  if (lado === "origen") return { centroOrigenId: centroSaludId };
  if (lado === "destino") return { centroDestinoId: centroSaludId };
  return {
    OR: [{ centroOrigenId: centroSaludId }, { centroDestinoId: centroSaludId }],
  };
}

export async function listarSolicitudesDelCentro(params: {
  centroSaludId: string;
  rol?: "origen" | "destino";
  estado?: EstadoSolicitud;
}) {
  const { centroSaludId, rol, estado } = params;

  return prisma.solicitudTraslado.findMany({
    where: {
      AND: [filtroPorLado(centroSaludId, rol ?? "cualquiera"), estado ? { estado } : {}],
    },
    select: camposSolicitud,
    orderBy: { fechaSolicitud: "desc" },
    take: LIMITE_LISTADO,
  });
}

/**
 * La solicitud, solo si el centro del usuario está del lado pedido.
 *
 *  - "cualquiera": origen o destino (lecturas: ficha, bitácora, ranking).
 *  - "origen": lo que hace el médico derivante (corregir, triaje, elegir destino).
 *  - "destino": lo que hace el médico receptor (aprobar).
 *
 * null significa "no existe" o "no es de tu centro": el handler responde 404 en
 * los dos casos, a propósito. Un 403 confirmaría que el id es real.
 */
export async function obtenerSolicitudDelCentro(
  id: string,
  centroSaludId: string,
  lado: LadoDerivacion = "cualquiera",
) {
  return prisma.solicitudTraslado.findFirst({
    where: { id, ...filtroPorLado(centroSaludId, lado) },
    select: {
      ...camposSolicitud,
      evaluacionTriaje: { select: camposEvaluacion },
      asignacionesTripulacion: {
        select: {
          asignadaEn: true,
          tripulacionMedica: {
            select: {
              id: true,
              patenteAmbulancia: true,
              paramedicoResponsable: true,
              estado: true,
            },
          },
        },
        orderBy: { asignadaEn: "asc" },
      },
    },
  });
}

export async function crearSolicitud(
  datos: CrearSolicitud,
  centroOrigenId: string,
) {
  return prisma.solicitudTraslado.create({
    data: {
      pacienteDni: datos.pacienteDni,
      centroOrigenId,
    },
    select: camposSolicitud,
  });
}

/** Corrige datos solo si sigue PENDIENTE y es del centro de origen. Si no, null. */
export async function actualizarSolicitudPendiente(params: {
  id: string;
  centroOrigenId: string;
  datos: ActualizarSolicitud;
}) {
  const { id, centroOrigenId, datos } = params;
  const { count } = await prisma.solicitudTraslado.updateMany({
    where: { id, centroOrigenId, estado: "PENDIENTE" },
    data: datos,
  });
  if (count === 0) return null;

  return prisma.solicitudTraslado.findUnique({
    where: { id },
    select: camposSolicitud,
  });
}

/**
 * Guarda la evaluación y pasa la solicitud a EVALUANDO, las dos cosas o ninguna.
 *
 * El cambio de estado es condicional (solo desde PENDIENTE) y va primero: si dos
 * médicos mandan el triaje a la vez, el segundo no pasa el `where`, se devuelve
 * null (→ 409) y nunca llega a chocar con el @unique de `solicitudId` (→ 500).
 */
export async function registrarEvaluacion(
  solicitudId: string,
  datos: EvaluacionAGuardar & { origenNivel: OrigenNivelUrgencia },
) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.solicitudTraslado.updateMany({
      where: { id: solicitudId, estado: "PENDIENTE" },
      data: { estado: "EVALUANDO" },
    });
    if (count === 0) return null;

    return tx.evaluacionTriaje.create({
      data: { solicitudId, ...datos },
      select: { ...camposEvaluacion, solicitudId: true },
    });
  });
}

/**
 * El médico derivante elige el centro de destino del ranking (HU04).
 *
 * Condicional a EVALUANDO y al centro de origen: una vez aprobada, el destino ya
 * reservó la cama y no se cambia. Devuelve null si no pasó el `where`.
 */
export async function asignarDestino(params: {
  solicitudId: string;
  centroOrigenId: string;
  centroDestinoId: string;
}) {
  const { solicitudId, centroOrigenId, centroDestinoId } = params;
  const { count } = await prisma.solicitudTraslado.updateMany({
    where: { id: solicitudId, centroOrigenId, estado: "EVALUANDO" },
    data: { centroDestinoId },
  });
  if (count === 0) return null;

  return prisma.solicitudTraslado.findUnique({
    where: { id: solicitudId },
    select: camposSolicitud,
  });
}

export async function listarBitacora(solicitudId: string) {
  return prisma.registroBitacora.findMany({
    where: { solicitudId },
    select: {
      id: true,
      fechaHora: true,
      evento: true,
      observaciones: true,
      tripulacionMedicaId: true,
    },
    orderBy: { fechaHora: "asc" },
    take: LIMITE_LISTADO,
  });
}

/** Se lanza adentro de la transacción solo para deshacerla. Nunca sale de acá. */
class SinCamaAlReservar extends Error {}

export type ResultadoAprobacion =
  | { resultado: "APROBADA"; solicitud: Prisma.SolicitudTrasladoGetPayload<{ select: typeof camposSolicitud }> }
  | { resultado: "ESTADO_CAMBIO" }
  | { resultado: "SIN_CAMA" };

/**
 * Operación del flujo principal (HU04): el receptor confirma, se reserva la cama
 * y la solicitud pasa a APROBADA con fecha y hora de la decisión (HU04).
 *
 * Todo o nada, en una transacción:
 *  1. Cambio de estado condicional (EVALUANDO y destino = su centro). Si no pasa,
 *     otro usuario la cambió en el medio → ESTADO_CAMBIO.
 *  2. Descuento de cama condicional (`camasDisponibles > 0`). Si otro médico tomó
 *     la última cama entre la verificación y este punto, se deshace el paso 1
 *     → SIN_CAMA. Es el caso de error "en el instante exacto de la confirmación".
 *
 * Los dos resultados negativos son esperados: se devuelven, no se lanzan.
 */
export async function aprobarSolicitud(params: {
  solicitudId: string;
  centroDestinoId: string;
  unidadId: string;
}): Promise<ResultadoAprobacion> {
  const { solicitudId, centroDestinoId, unidadId } = params;

  try {
    return await prisma.$transaction(async (tx) => {
      const cambio = await tx.solicitudTraslado.updateMany({
        where: { id: solicitudId, centroDestinoId, estado: "EVALUANDO" },
        data: { estado: "APROBADA", fechaAprobacion: new Date() },
      });
      if (cambio.count === 0) return { resultado: "ESTADO_CAMBIO" as const };

      const reserva = await tx.unidadCuidados.updateMany({
        where: { id: unidadId, camasDisponibles: { gt: 0 } },
        data: { camasDisponibles: { decrement: 1 } },
      });
      if (reserva.count === 0) throw new SinCamaAlReservar();

      const solicitud = await tx.solicitudTraslado.findUniqueOrThrow({
        where: { id: solicitudId },
        select: camposSolicitud,
      });
      return { resultado: "APROBADA" as const, solicitud };
    });
  } catch (error) {
    if (error instanceof SinCamaAlReservar) return { resultado: "SIN_CAMA" };
    throw error;
  }
}

/**
 * Pasa la solicitud a RECHAZADA y, si tenía cama reservada, la devuelve.
 *
 * Si hay que liberar cama lo decide `liberaCamaAlRechazar` (lib/reglas-solicitud.ts)
 * y llega acá como parámetro: esta función no decide, ejecuta.
 *
 * El cambio de estado es condicional al estado que leyó el handler: si en el
 * medio alguien la aprobó o la rechazó, no se toca nada y se devuelve null.
 */
export async function rechazarSolicitud(params: {
  solicitudId: string;
  estadoLeido: EstadoSolicitud;
  camaALiberar: { centroSaludId: string; tipo: TipoUnidad } | null;
}) {
  const { solicitudId, estadoLeido, camaALiberar } = params;

  return prisma.$transaction(async (tx) => {
    const cambio = await tx.solicitudTraslado.updateMany({
      where: { id: solicitudId, estado: estadoLeido },
      data: { estado: "RECHAZADA" },
    });
    if (cambio.count === 0) return null;

    if (camaALiberar) {
      // No hay @@unique([centroSaludId, tipo]): se devuelve a una sola unidad.
      const unidad = await tx.unidadCuidados.findFirst({
        where: {
          centroSaludId: camaALiberar.centroSaludId,
          tipo: camaALiberar.tipo,
        },
        select: { id: true },
      });
      if (unidad) {
        await tx.unidadCuidados.update({
          where: { id: unidad.id },
          data: { camasDisponibles: { increment: 1 } },
        });
      }
    }

    return tx.solicitudTraslado.findUnique({
      where: { id: solicitudId },
      select: camposSolicitud,
    });
  });
}
