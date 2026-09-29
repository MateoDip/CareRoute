import { NextResponse } from "next/server";
import { ROLES_CLINICOS, requerirUsuarioConCentro } from "@/lib/auth";
import { listarBitacora, obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import { responderError } from "@/lib/errores";
import { noEncontrado } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

/**
 * GET /api/solicitudes/:id/bitacora — historial de eventos del traslado (HU07).
 *
 * Se verifica el acceso a la solicitud antes de listar sus hijos: sin esto, la
 * bitácora sería una puerta lateral para leer datos de otro centro.
 *
 * Registrar eventos (y pasar a EN_CURSO / FINALIZADA) queda fuera del contrato
 * actual: ver docs/adr/0002.
 */
export async function GET(_request: Request, { params }: Contexto) {
  try {
    const usuario = await requerirUsuarioConCentro(ROLES_CLINICOS);
    const { id } = await params;

    const solicitud = await obtenerSolicitudDelCentro(id, usuario.centroSaludId);
    if (!solicitud) return noEncontrado("La solicitud no existe");

    const registros = await listarBitacora(id);
    return NextResponse.json(registros, { status: 200 });
  } catch (error) {
    return responderError("GET /api/solicitudes/:id/bitacora", error);
  }
}
