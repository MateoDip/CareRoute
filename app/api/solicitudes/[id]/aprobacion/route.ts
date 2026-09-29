import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { listarUnidadesDelCentro } from "@/lib/db/centros";
import {
  aprobarSolicitud,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import { tiposConCamaLibre, unidadConCamaLibre } from "@/lib/disponibilidad";
import { responderError } from "@/lib/errores";
import { capacidadAgotada, conflicto, noEncontrado } from "@/lib/http";
import { impedimentoParaAprobar } from "@/lib/reglas-solicitud";
import { unidadRequerida } from "@/lib/scoring-hospitales";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/aprobacion — OPERACIÓN DEL FLUJO PRINCIPAL (HU04)
 *
 * El receptor del centro que eligió el derivante confirma: se reserva la cama,
 * la solicitud pasa a APROBADA y queda la fecha y hora de la decisión.
 *
 * POST a un sub-recurso y no PATCH: un PATCH genérico dejaría escribir
 * `estado: "APROBADA"` salteando las reglas. Con una ruta propia son inevitables.
 *
 * Sin body: el destino ya está en la solicitud y el centro del receptor sale de
 * su sesión. Nada que el cliente pueda mandar cambia a qué centro se deriva.
 */
export async function POST(_request: Request, { params }: Contexto) {
  try {
    // 1-2. SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_RECEPTOR");
    const { id } = await params;

    // 3. PERTENENCIA → 404. Solo la ve el centro elegido como destino.
    const solicitud = await obtenerSolicitudDelCentro(
      id,
      usuario.centroSaludId,
      "destino",
    );
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // 4. REGLAS → 409
    const impedimento = impedimentoParaAprobar({
      estado: solicitud.estado,
      centroOrigenId: solicitud.centroOrigenId,
      centroDestinoId: usuario.centroSaludId,
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
    const unidades = await listarUnidadesDelCentro(usuario.centroSaludId);
    const unidad = unidadConCamaLibre(unidades, tipoRequerido);
    if (!unidad) {
      return capacidadAgotada(tipoRequerido, tiposConCamaLibre(unidades));
    }

    // 5. DELEGAR — reserva de cama y cambio de estado, todo o nada.
    const aprobacion = await aprobarSolicitud({
      solicitudId: id,
      centroDestinoId: usuario.centroSaludId,
      unidadId: unidad.id,
    });

    if (aprobacion.resultado === "SIN_CAMA") {
      // La última cama se ocupó entre la verificación y la reserva (HU04).
      const actuales = await listarUnidadesDelCentro(usuario.centroSaludId);
      return capacidadAgotada(tipoRequerido, tiposConCamaLibre(actuales));
    }
    if (aprobacion.resultado === "ESTADO_CAMBIO") {
      return conflicto("La solicitud cambió de estado mientras se procesaba");
    }

    // 6. RESPONDER → 201
    return NextResponse.json(
      { solicitud: aprobacion.solicitud, unidadReservada: unidad.tipo },
      { status: 201 },
    );
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/aprobacion", error);
  }
}
