import { NextResponse } from "next/server";
import { listarBitacora, obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import { noAutenticado, noEncontrado } from "@/lib/http";
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
 * TODO (clase 5): el POST que agrega eventos a la bitácora es parte del seguimiento
 * del traslado, junto con las transiciones a EN_CURSO y FINALIZADA.
 */
export async function GET(request: Request, { params }: Contexto) {
  const { id } = await params;

  const sesion = await getSesion(request);
  if (!sesion) return noAutenticado();

  // Se verifica el acceso a la solicitud antes de listar sus hijos: sin esto, la
  // bitácora sería una puerta lateral para leer datos de otro centro.
  const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
  if (!solicitud) return noEncontrado("La solicitud no existe");

  const registros = await listarBitacora(id);
  return NextResponse.json(registros, { status: 200 });
}
