import { NextResponse } from "next/server";
import { buscarCandidatos } from "@/lib/db/centros";
import { obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import { conflicto, noAutenticado, noEncontrado } from "@/lib/http";
import { getSesion } from "@/lib/sesion";

type Contexto = { params: Promise<{ id: string }> };

/**
 * GET /api/solicitudes/:id/candidatos — ranking de hospitales (HU03).
 *
 * Va anidado bajo la solicitud porque los tres criterios del scoring salen de ella:
 * el tipo de cama depende del nivel de urgencia de su evaluación de triaje, y el
 * centro de origen se excluye del ranking.
 *
 * Si fuera un endpoint independiente, el cliente tendría que mandar esos criterios
 * — y podría mentir: mandar urgencia BAJO para un paciente crítico devolvería
 * hospitales que no corresponden. Acá el servidor los lee de la base.
 */
export async function GET(request: Request, { params }: Contexto) {
  const { id } = await params;

  const sesion = await getSesion(request);
  if (!sesion) return noAutenticado();

  const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
  if (!solicitud) return noEncontrado("La solicitud no existe");

  // Sin triaje no hay nivel de urgencia, y sin urgencia no se sabe qué tipo de cama
  // buscar. El recurso existe pero su estado no permite la operación: 409.
  if (!solicitud.evaluacionTriaje) {
    return conflicto(
      "La solicitud todavía no tiene evaluación de triaje: no se puede calcular el ranking",
    );
  }

  const resultado = await buscarCandidatos({
    urgencia: solicitud.evaluacionTriaje.nivelUrgenciaSugerido,
    centroOrigenId: solicitud.centroOrigenId,
  });

  return NextResponse.json(resultado, { status: 200 });
}
