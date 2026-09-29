import { NextResponse } from "next/server";
import { ROLES_CLINICOS, requerirUsuarioConCentro } from "@/lib/auth";
import {
  obtenerSolicitudDelCentro,
  rechazarSolicitud,
} from "@/lib/db/solicitudes";
import { responderError } from "@/lib/errores";
import { conflicto, noEncontrado, sinPermiso } from "@/lib/http";
import {
  ladoQueRechaza,
  liberaCamaAlRechazar,
  rolesQuePuedenRechazar,
  transicionesPosibles,
} from "@/lib/reglas-solicitud";
import { unidadRequerida } from "@/lib/scoring-hospitales";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/rechazo — cancela una derivación (spec §6).
 *
 * Una APROBADA ya no puede cancelarla el centro emisor: el receptor reservó la
 * cama y preparó el equipo. Antes, cualquiera de los dos médicos puede hacerlo,
 * cada uno desde su lado. Sin body: el modelo no guarda motivo de rechazo.
 */
export async function POST(_request: Request, { params }: Contexto) {
  try {
    // 1-2. SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro(ROLES_CLINICOS);
    const { id } = await params;

    // 3. PERTENENCIA → 404. Cada médico solo ve su lado de la derivación.
    const lado = ladoQueRechaza(usuario.rol) ?? "origen";
    const solicitud = await obtenerSolicitudDelCentro(
      id,
      usuario.centroSaludId,
      lado,
    );
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // 4. REGLAS de estado → 409: si nadie puede rechazarla, el rol no importa.
    const rolesHabilitados = rolesQuePuedenRechazar(solicitud.estado);
    if (rolesHabilitados.length === 0) {
      return conflicto("La solicitud no puede rechazarse en este estado", {
        estadoActual: solicitud.estado,
        transicionesPosibles: transicionesPosibles(solicitud.estado),
      });
    }

    // 5. REGLA de dominio sobre el rol → 403 (spec §6): el usuario ya sabe que
    // la solicitud existe (es de su centro); lo que le falta es el permiso.
    if (!rolesHabilitados.includes(usuario.rol)) {
      return sinPermiso(
        "Una solicitud aprobada solo puede rechazarla el centro receptor",
        { rolesHabilitados },
      );
    }

    // 6. DELEGAR
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
    if (!rechazada) {
      return conflicto("La solicitud cambió de estado mientras se procesaba");
    }

    return NextResponse.json(rechazada, { status: 200 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/rechazo", error);
  }
}
