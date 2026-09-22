import { NextResponse } from "next/server";
import { listarBitacora, obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import {
  errorInterno,
  noAutenticado,
  noEncontrado,
} from "@/lib/http";
import { getSesion } from "@/lib/sesion";

type Contexto = { params: Promise<{ id: string }> };

/**
 * GET /api/solicitudes/:id/bitacora — historial de eventos del traslado (HU07).
 *
 * Va anidado porque un RegistroBitacora no significa nada fuera de su solicitud:
 * "llegada a origen, 14:32" sin saber de qué traslado es información inútil. El
 * schema lo confirma — `solicitudId` es obligatorio, no puede haber registros
 * huérfanos.
 *
 * El POST que agrega eventos es parte del seguimiento del traslado (transiciones a
 * EN_CURSO y FINALIZADA), que no está en el contrato de docs/api.md todavía. Ver
 * docs/adr/0002.
 */
export async function GET(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    const sesion = await getSesion(request);
    if (!sesion) return noAutenticado();

    // Se verifica el acceso a la solicitud antes de listar sus hijos: sin esto, la
    // bitácora sería una puerta lateral para leer datos de otro centro.
    const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
    if (!solicitud) return noEncontrado("La solicitud no existe");

    const registros = await listarBitacora(id);
    return NextResponse.json(registros, { status: 200 });
  } catch (error) {
    return errorInterno("GET /api/solicitudes/:id/bitacora", error);
  }
}
