import { NextResponse } from "next/server";
import {
  obtenerSolicitudDelCentro,
  rechazarSolicitud,
} from "@/lib/db/solicitudes";
import {
  conflicto,
  errorInterno,
  noAutenticado,
  noEncontrado,
  sinPermiso,
} from "@/lib/http";
import {
  liberaCamaAlRechazar,
  rolesQuePuedenRechazar,
  transicionesPosibles,
} from "@/lib/reglas-solicitud";
import { unidadRequerida } from "@/lib/scoring-hospitales";
import { getSesion } from "@/lib/sesion";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/rechazo — cancela una derivación (spec §6).
 *
 * Regla de dominio: una solicitud APROBADA ya no puede cancelarla el centro
 * emisor — el receptor reservó la cama y preparó el equipo. Antes de aprobarse,
 * cualquiera de los dos médicos puede echarse atrás.
 *
 * Sin body: el modelo no tiene dónde guardar un motivo de rechazo. Si hace falta,
 * es una migración y un campo nuevo, no un dato que se acepta y se tira.
 */
export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    // 1. AUTORIZAR (sesión) → 401
    const sesion = await getSesion(request);
    if (!sesion) return noAutenticado();

    const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // 2. REGLAS de estado → 409: si nadie puede rechazarla, el rol no importa.
    const rolesHabilitados = rolesQuePuedenRechazar(solicitud.estado);
    if (rolesHabilitados.length === 0) {
      return conflicto("La solicitud no puede rechazarse en este estado", {
        estadoActual: solicitud.estado,
        transicionesPosibles: transicionesPosibles(solicitud.estado),
      });
    }

    // 3. REGLAS de rol → 403: el estado admite el rechazo, pero no para este rol.
    if (!rolesHabilitados.includes(sesion.rol)) {
      return sinPermiso(
        solicitud.estado === "APROBADA"
          ? "Una solicitud aprobada solo puede rechazarla el centro receptor"
          : "Tu rol no puede rechazar esta solicitud",
        { rolesHabilitados },
      );
    }

    // Cada médico rechaza desde su lado de la derivación.
    const esSuLado =
      sesion.rol === "MEDICO_DERIVANTE"
        ? solicitud.centroOrigenId === sesion.centroSaludId
        : solicitud.centroDestinoId === sesion.centroSaludId;
    if (!esSuLado) {
      return sinPermiso("Solo el centro que corresponde a tu rol puede rechazarla");
    }

    // 4. DELEGAR
    const camaALiberar =
      liberaCamaAlRechazar(solicitud.estado) &&
      solicitud.centroDestinoId &&
      solicitud.evaluacionTriaje
        ? {
            centroSaludId: solicitud.centroDestinoId,
            tipo: unidadRequerida(solicitud.evaluacionTriaje.nivelUrgenciaSugerido),
          }
        : null;

    const rechazada = await rechazarSolicitud({
      solicitudId: id,
      estadoLeido: solicitud.estado,
      camaALiberar,
    });

    // null: otro usuario cambió el estado entre la lectura y la escritura.
    if (!rechazada) {
      return conflicto("La solicitud cambió de estado mientras se procesaba");
    }

    // 5. RESPONDER
    return NextResponse.json(rechazada, { status: 200 });
  } catch (error) {
    return errorInterno("POST /api/solicitudes/:id/rechazo", error);
  }
}
