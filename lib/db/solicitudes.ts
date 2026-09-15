import type { EstadoSolicitud, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ActualizarSolicitud,
  CrearSolicitud,
} from "@/lib/schemas/solicitud-traslado";
import type { CrearEvaluacion } from "@/lib/schemas/evaluacion-triaje";
import { unidadRequerida } from "@/lib/scoring-hospitales";

/**
 * Capa de consultas.
 *
 * Reglas de la clase que se respetan acá:
 *  - Este archivo no conoce el objeto Request. Recibe datos, devuelve datos.
 *  - Todo listado lleva `take`: sin límite, una consulta puede traer decenas de
 *    miles de filas y tumbar el servidor.
 *  - Todo `select` es explícito: lo que no se selecciona no se puede filtrar por
 *    accidente. En un sistema con datos de pacientes eso importa.
 */

const LIMITE_LISTADO = 50;

const camposSolicitud = {
  id: true,
  centroOrigenId: true,
  centroDestinoId: true,
  pacienteDni: true,
  estado: true,
  fechaSolicitud: true,
} satisfies Prisma.SolicitudTrasladoSelect;

/** Estados en los que la solicitud todavía se puede editar o aprobar. */
export const ESTADOS_EDITABLES: EstadoSolicitud[] = ["PENDIENTE"];
export const ESTADOS_APROBABLES: EstadoSolicitud[] = ["PENDIENTE", "EVALUANDO"];

export async function listarSolicitudesDelCentro(params: {
  centroSaludId: string;
  rol?: "origen" | "destino";
  estado?: EstadoSolicitud;
}) {
  const { centroSaludId, rol, estado } = params;

  const filtroCentro: Prisma.SolicitudTrasladoWhereInput =
    rol === "origen"
      ? { centroOrigenId: centroSaludId }
      : rol === "destino"
        ? { centroDestinoId: centroSaludId }
        : {
            OR: [
              { centroOrigenId: centroSaludId },
              { centroDestinoId: centroSaludId },
            ],
          };

  return prisma.solicitudTraslado.findMany({
    where: estado ? { AND: [filtroCentro, { estado }] } : filtroCentro,
    select: camposSolicitud,
    orderBy: { fechaSolicitud: "desc" },
    take: LIMITE_LISTADO,
  });
}

/**
 * Devuelve la solicitud solo si el centro del usuario está involucrado.
 *
 * Si no lo está, devuelve `null` — y el handler responde 404, no 403. Así no se
 * confirma la existencia de recursos que el usuario no puede ver.
 */
export async function obtenerSolicitudDelCentro(
  id: string,
  centroSaludId: string,
) {
  return prisma.solicitudTraslado.findFirst({
    where: {
      id,
      OR: [
        { centroOrigenId: centroSaludId },
        { centroDestinoId: centroSaludId },
      ],
    },
    select: {
      ...camposSolicitud,
      evaluacionTriaje: {
        select: {
          id: true,
          frecuenciaCardiaca: true,
          presionSistolica: true,
          presionDiastolica: true,
          nivelUrgenciaSugerido: true,
        },
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

export async function actualizarSolicitud(
  id: string,
  datos: ActualizarSolicitud,
) {
  return prisma.solicitudTraslado.update({
    where: { id },
    data: datos,
    select: camposSolicitud,
  });
}

export async function registrarEvaluacion(
  solicitudId: string,
  datos: CrearEvaluacion,
) {
  return prisma.$transaction(async (tx) => {
    const evaluacion = await tx.evaluacionTriaje.create({
      data: { solicitudId, ...datos },
      select: {
        id: true,
        solicitudId: true,
        frecuenciaCardiaca: true,
        presionSistolica: true,
        presionDiastolica: true,
        nivelUrgenciaSugerido: true,
      },
    });

    await tx.solicitudTraslado.update({
      where: { id: solicitudId },
      data: { estado: "EVALUANDO" },
    });

    return evaluacion;
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

/**
 * Operación del flujo principal (HU04).
 *
 * Asigna el centro destino, reserva una cama y pasa la solicitud a APROBADA. Las
 * tres cosas ocurren dentro de una transacción: si falla cualquiera, no queda una
 * solicitud aprobada sin cama reservada ni una cama descontada sin aprobación.
 *
 * Las verificaciones previas (estado, existencia de cama, permisos) las hace el
 * route handler antes de llamar acá.
 */
export async function aprobarSolicitud(params: {
  solicitudId: string;
  centroDestinoId: string;
  unidadId: string;
}) {
  const { solicitudId, centroDestinoId, unidadId } = params;

  return prisma.$transaction(async (tx) => {
    await tx.unidadCuidados.update({
      where: { id: unidadId },
      data: { camasDisponibles: { decrement: 1 } },
    });

    return tx.solicitudTraslado.update({
      where: { id: solicitudId },
      data: { centroDestinoId, estado: "APROBADA" },
      select: camposSolicitud,
    });
  });
}

/**
 * Busca una unidad con cama libre del tipo que necesita el paciente.
 *
 * Devuelve `null` si el centro no tiene ninguna. El handler lo traduce a 409.
 */
export async function buscarUnidadDisponible(params: {
  centroSaludId: string;
  urgencia: Parameters<typeof unidadRequerida>[0];
}) {
  return prisma.unidadCuidados.findFirst({
    where: {
      centroSaludId: params.centroSaludId,
      tipo: unidadRequerida(params.urgencia),
      camasDisponibles: { gt: 0 },
    },
    select: { id: true, tipo: true, camasDisponibles: true },
  });
}
