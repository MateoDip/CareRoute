import { NextResponse } from "next/server";
import { listarCentrosConUnidades } from "@/lib/db/centros";
import { obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import {
  conflicto,
  errorInterno,
  noAutenticado,
  noEncontrado,
} from "@/lib/http";
import { rankearCandidatos, unidadRequerida } from "@/lib/scoring-hospitales";
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
  try {
    const { id } = await params;

    const sesion = await getSesion(request);
    if (!sesion) return noAutenticado();

    const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // Sin triaje no hay nivel de urgencia, y sin urgencia no se sabe qué tipo de
    // cama buscar. El recurso existe pero su estado no permite la operación: 409.
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
    return errorInterno("GET /api/solicitudes/:id/candidatos", error);
  }
}
