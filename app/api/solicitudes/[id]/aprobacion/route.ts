import { NextResponse } from "next/server";
import { obtenerCentro } from "@/lib/db/centros";
import {
  ESTADOS_APROBABLES,
  aprobarSolicitud,
  buscarUnidadDisponible,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import {
  conflicto,
  errorValidacion,
  noAutenticado,
  noEncontrado,
  sinPermiso,
} from "@/lib/http";
import { aprobarSolicitudSchema } from "@/lib/schemas/solicitud-traslado";
import { getSesion } from "@/lib/sesion";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/aprobacion — OPERACIÓN DEL FLUJO PRINCIPAL (HU04)
 *
 * Es lo que diferencia el proyecto de un CRUD. No es "actualizar un campo": es un
 * acto con reglas propias y consecuencias sobre otros recursos.
 *
 * Por qué es POST a un sub-recurso y no PATCH sobre la solicitud: un PATCH genérico
 * dejaría que cualquiera escriba `estado: "APROBADA"` salteándose las verificaciones
 * de abajo. Con una ruta dedicada, las reglas son inevitables.
 *
 * Regla de dominio del AGENTS.md: la IA nunca decide sola. Esta operación es
 * exactamente la acción explícita del profesional que el sistema exige.
 */
export async function POST(request: Request, { params }: Contexto) {
  const { id } = await params;

  // 1. VALIDAR
  const body: unknown = await request.json().catch(() => null);
  const datos = aprobarSolicitudSchema.safeParse(body);
  if (!datos.success) return errorValidacion(datos.error);

  // 2. AUTORIZAR
  const sesion = await getSesion(request);
  if (!sesion) return noAutenticado();
  if (sesion.rol !== "MEDICO_RECEPTOR") {
    return sinPermiso("Solo un médico receptor puede aprobar una derivación");
  }

  const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
  if (!solicitud) return noEncontrado("La solicitud no existe");

  // Un receptor solo aprueba recibir en su propio centro.
  if (datos.data.centroDestinoId !== sesion.centroSaludId) {
    return sinPermiso("Solo se puede aprobar una derivación hacia el propio centro");
  }

  const centroDestino = await obtenerCentro(datos.data.centroDestinoId);
  if (!centroDestino) return noEncontrado("El centro de destino no existe");

  // 3. REGLAS DE NEGOCIO — todo lo que falla acá es 409: el recurso existe y el
  //    pedido está bien formado, pero su estado no admite la operación.
  if (!ESTADOS_APROBABLES.includes(solicitud.estado)) {
    return conflicto(
      `No se puede aprobar una solicitud en estado ${solicitud.estado}`,
    );
  }

  if (!solicitud.evaluacionTriaje) {
    return conflicto(
      "No se puede aprobar una derivación sin evaluación de triaje previa",
    );
  }

  const unidad = await buscarUnidadDisponible({
    centroSaludId: datos.data.centroDestinoId,
    urgencia: solicitud.evaluacionTriaje.nivelUrgenciaSugerido,
  });

  if (!unidad) {
    return conflicto(
      "El centro de destino no tiene camas disponibles del tipo requerido",
    );
  }

  // TODO (clase 5): verificar que el equipamiento requerido por el paciente esté
  // OPERATIVO en el centro de destino. Hoy no existe el vínculo entre la solicitud
  // y el equipamiento que necesita: hace falta una migración que lo agregue.

  // 4. DELEGAR — la reserva de la cama y el cambio de estado van en una transacción.
  const aprobada = await aprobarSolicitud({
    solicitudId: id,
    centroDestinoId: datos.data.centroDestinoId,
    unidadId: unidad.id,
  });

  // 5. RESPONDER
  return NextResponse.json(
    { solicitud: aprobada, unidadReservada: unidad.tipo },
    { status: 201 },
  );
}
