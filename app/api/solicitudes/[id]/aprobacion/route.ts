import type { TipoUnidad } from "@prisma/client";
import { NextResponse } from "next/server";
import { listarUnidadesDelCentro, obtenerCentro } from "@/lib/db/centros";
import {
  aprobarSolicitud,
  obtenerSolicitudParaRecepcion,
} from "@/lib/db/solicitudes";
import {
  tiposConCamaLibre,
  unidadConCamaLibre,
  type UnidadDisponible,
} from "@/lib/disponibilidad";
import {
  conflicto,
  errorInterno,
  errorValidacion,
  noAutenticado,
  noEncontrado,
  sinPermiso,
} from "@/lib/http";
import { impedimentoParaAprobar } from "@/lib/reglas-solicitud";
import { aprobarSolicitudSchema } from "@/lib/schemas/solicitud-traslado";
import { unidadRequerida } from "@/lib/scoring-hospitales";
import { getSesion } from "@/lib/sesion";

type Contexto = { params: Promise<{ id: string }> };

/**
 * 409 de capacidad (H3). Lleva los tipos que sí tienen cama como array aparte:
 * la pantalla los necesita para recargar el ranking, no para leerlos.
 */
function capacidadAgotada(
  tipoRequerido: TipoUnidad,
  unidades: readonly UnidadDisponible[],
) {
  return conflicto(
    `Capacidad agotada: el centro de destino no tiene camas ${tipoRequerido} disponibles`,
    { tipoRequerido, tiposConCamaLibre: tiposConCamaLibre(unidades) },
  );
}

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
 *
 * El equipamiento requerido todavía no se verifica: no existe el vínculo entre la
 * solicitud y lo que necesita el paciente. Ver docs/adr/0002.
 */
export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    // 1. VALIDAR → 400
    const body: unknown = await request.json().catch(() => null);
    const datos = aprobarSolicitudSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);
    const { centroDestinoId } = datos.data;

    // 2. AUTORIZAR → 401 / 403
    const sesion = await getSesion(request);
    if (!sesion) return noAutenticado();
    if (sesion.rol !== "MEDICO_RECEPTOR") {
      return sinPermiso("Solo un médico receptor puede aprobar una derivación");
    }

    const solicitud = await obtenerSolicitudParaRecepcion(
      id,
      sesion.centroSaludId,
    );
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // Un receptor solo aprueba recibir en su propio centro.
    if (centroDestinoId !== sesion.centroSaludId) {
      return sinPermiso(
        "Solo se puede aprobar una derivación hacia el propio centro",
      );
    }

    const centroDestino = await obtenerCentro(centroDestinoId);
    if (!centroDestino) return noEncontrado("El centro de destino no existe");

    // 3. REGLAS → 409. El request está bien; es el estado el que no lo admite.
    const impedimento = impedimentoParaAprobar({
      estado: solicitud.estado,
      centroOrigenId: solicitud.centroOrigenId,
      centroDestinoId,
    });
    if (impedimento?.motivo === "ESTADO_INCOMPATIBLE") {
      return conflicto("La solicitud no puede aprobarse en este estado", {
        estadoActual: impedimento.estadoActual,
        transicionesPosibles: impedimento.transicionesPosibles,
      });
    }
    if (impedimento?.motivo === "DESTINO_IGUAL_A_ORIGEN") {
      return conflicto("El centro de destino no puede ser el de origen");
    }

    if (!solicitud.evaluacionTriaje) {
      return conflicto("Falta la evaluación de triaje", {
        estadoActual: solicitud.estado,
      });
    }

    const tipoRequerido = unidadRequerida(
      solicitud.evaluacionTriaje.nivelUrgenciaSugerido,
    );
    const unidades = await listarUnidadesDelCentro(centroDestinoId);
    const unidad = unidadConCamaLibre(unidades, tipoRequerido);
    if (!unidad) return capacidadAgotada(tipoRequerido, unidades);

    // 4. DELEGAR — reserva de cama y cambio de estado en una transacción.
    const aprobada = await aprobarSolicitud({
      solicitudId: id,
      centroDestinoId,
      unidadId: unidad.id,
    });

    // null: la última cama se ocupó entre la verificación y la reserva (H3).
    if (!aprobada) {
      const actuales = await listarUnidadesDelCentro(centroDestinoId);
      return capacidadAgotada(tipoRequerido, actuales);
    }

    // 5. RESPONDER → 201
    return NextResponse.json(
      { solicitud: aprobada, unidadReservada: unidad.tipo },
      { status: 201 },
    );
  } catch (error) {
    return errorInterno("POST /api/solicitudes/:id/aprobacion", error);
  }
}
