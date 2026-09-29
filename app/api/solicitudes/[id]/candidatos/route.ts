import { NextResponse } from "next/server";
import { ROLES_CLINICOS, requerirUsuarioConCentro } from "@/lib/auth";
import { listarCentrosConUnidades } from "@/lib/db/centros";
import { obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import { responderError } from "@/lib/errores";
import { conflicto, noEncontrado } from "@/lib/http";
import { rankearCandidatos, unidadRequerida } from "@/lib/scoring-hospitales";

type Contexto = { params: Promise<{ id: string }> };

/**
 * GET /api/solicitudes/:id/candidatos — ranking de hospitales (HU03).
 *
 * Anidado bajo la solicitud porque los criterios del scoring salen de ella: el
 * tipo de cama depende de su triaje y el centro de origen se excluye. Si el
 * cliente los mandara, podría mentir (urgencia BAJO para un paciente crítico).
 */
export async function GET(_request: Request, { params }: Contexto) {
  try {
    const usuario = await requerirUsuarioConCentro(ROLES_CLINICOS);
    const { id } = await params;

    const solicitud = await obtenerSolicitudDelCentro(id, usuario.centroSaludId);
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // Sin triaje no hay nivel de urgencia ni tipo de cama a buscar: 409.
    if (!solicitud.evaluacionTriaje) {
      return conflicto("Falta la evaluación de triaje", {
        estadoActual: solicitud.estado,
      });
    }

    const tipoUnidadRequerida = unidadRequerida(
      solicitud.evaluacionTriaje.nivelUrgenciaSugerido,
    );
    const centros = await listarCentrosConUnidades();
    const candidatos = rankearCandidatos(
      centros,
      tipoUnidadRequerida,
      solicitud.centroOrigenId,
    );

    return NextResponse.json(
      { tipoUnidadRequerida, candidatos },
      { status: 200 },
    );
  } catch (error) {
    return responderError("GET /api/solicitudes/:id/candidatos", error);
  }
}
