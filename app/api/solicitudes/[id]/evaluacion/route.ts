import { NextResponse } from "next/server";
import {
  obtenerSolicitudDelCentro,
  registrarEvaluacion,
} from "@/lib/db/solicitudes";
import {
  conflicto,
  errorValidacion,
  noAutenticado,
  noEncontrado,
  sinPermiso,
} from "@/lib/http";
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
 * TODO (clase 5): el nivel de urgencia lo manda el cliente. Cuando esté el módulo de
 * IA, lo sugiere el modelo a partir de la descripción clínica y el médico lo
 * confirma o corrige. La regla de dominio no cambia: la IA sugiere, nunca decide.
 */
export async function POST(request: Request, { params }: Contexto) {
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
    return conflicto("La solicitud ya tiene una evaluación de triaje");
  }

  const evaluacion = await registrarEvaluacion(id, datos.data);
  return NextResponse.json(evaluacion, { status: 201 });
}
