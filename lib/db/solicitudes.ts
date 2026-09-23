import type { EstadoSolicitud, Prisma, TipoUnidad } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ActualizarSolicitud,
  CrearSolicitud,
} from "@/lib/schemas/solicitud-traslado";
import type { CrearEvaluacion } from "@/lib/schemas/evaluacion-triaje";

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

/**
 * La solicitud tal como la ve un centro que podría recibirla (HU04).
 *
 * Además de las solicitudes donde su centro ya está involucrado, el receptor ve
 * las que todavía no tienen destino asignado: son las que puede aceptar. Sin
 * esto, `obtenerSolicitudDelCentro` le devolvería null a cualquier derivación
 * nueva y la aprobación respondería siempre 404.
 *
 * Una solicitud ya asignada a otro centro sigue devolviendo null → 404.
 */
export async function obtenerSolicitudParaRecepcion(
  id: string,
  centroSaludId: string,
) {
  return prisma.solicitudTraslado.findFirst({
    where: {
      id,
      OR: [
        { centroOrigenId: centroSaludId },
        { centroDestinoId: centroSaludId },
        { centroDestinoId: null },
      ],
    },
    select: {
      ...camposSolicitud,
      evaluacionTriaje: {
        select: { id: true, nivelUrgenciaSugerido: true },
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
 * El descuento es condicional (`camasDisponibles > 0`): si entre la verificación
 * del handler y este punto otro médico tomó la última cama, no se descuenta nada
 * y se devuelve null. Es el caso de error de H3 — "sin camas en el instante
 * exacto de la confirmación" — y el handler lo traduce a 409. No es una
 * excepción: es un resultado posible.
 */
export async function aprobarSolicitud(params: {
  solicitudId: string;
  centroDestinoId: string;
  unidadId: string;
}) {
  const { solicitudId, centroDestinoId, unidadId } = params;

  return prisma.$transaction(async (tx) => {
    const reserva = await tx.unidadCuidados.updateMany({
      where: { id: unidadId, camasDisponibles: { gt: 0 } },
      data: { camasDisponibles: { decrement: 1 } },
    });
    if (reserva.count === 0) return null;

    return tx.solicitudTraslado.update({
      where: { id: solicitudId },
      data: { centroDestinoId, estado: "APROBADA" },
      select: camposSolicitud,
    });
  });
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
