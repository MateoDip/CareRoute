import { NextResponse } from "next/server";
import {
  obtenerSolicitudDelCentro,
  registrarEvaluacion,
} from "@/lib/db/solicitudes";
import {
  conflicto,
  errorInterno,
  errorValidacion,
  noAutenticado,
  noEncontrado,
  sinPermiso,
} from "@/lib/http";
import {
  puedeTransicionar,
  transicionesPosibles,
} from "@/lib/reglas-solicitud";
import { crearEvaluacionSchema } from "@/lib/schemas/evaluacion-triaje";
import { getSesion } from "@/lib/sesion";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/evaluacion — registra la evaluación de triaje (HU02).
 *
 * `EvaluacionTriaje.solicitudId` es @unique: una sola evaluación por solicitud. Si
 * ya existe, se responde 409 explícitamente. Si no se verificara, Prisma tiraría una
 * excepción de constraint y el endpoint devolvería 500 — y un 500 significa "bug
 * mío", no "el cliente pidió algo imposible".
 *
 * Hoy el nivel de urgencia lo manda el médico. La sugerencia de la IA y la
 * auditoría de su corrección manual (spec §6) esperan una migración: ver
 * docs/adr/0002. La regla de dominio no cambia: la IA sugiere, nunca decide.
 */
export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    const body: unknown = await request.json().catch(() => null);
    const datos = crearEvaluacionSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    const sesion = await getSesion(request);
    if (!sesion) return noAutenticado();

    const solicitud = await obtenerSolicitudDelCentro(id, sesion.centroSaludId);
    if (!solicitud) return noEncontrado("La solicitud no existe");

    if (sesion.rol !== "MEDICO_DERIVANTE") {
      return sinPermiso("Solo un médico derivante puede registrar el triaje");
    }
    if (solicitud.centroOrigenId !== sesion.centroSaludId) {
      return sinPermiso("Solo el centro de origen puede registrar el triaje");
    }

    if (solicitud.evaluacionTriaje) {
      return conflicto("La solicitud ya fue evaluada", {
        estadoActual: solicitud.estado,
      });
    }

    // Registrar el triaje pasa la solicitud a EVALUANDO: una RECHAZADA no vuelve.
    if (!puedeTransicionar(solicitud.estado, "EVALUANDO")) {
      return conflicto("La solicitud no puede evaluarse en este estado", {
        estadoActual: solicitud.estado,
        transicionesPosibles: transicionesPosibles(solicitud.estado),
      });
    }

    const evaluacion = await registrarEvaluacion(id, datos.data);
    return NextResponse.json(evaluacion, { status: 201 });
  } catch (error) {
    return errorInterno("POST /api/solicitudes/:id/evaluacion", error);
  }
}
