import { NextResponse } from "next/server";
import {
  obtenerSolicitudDelCentro,
  registrarEvaluacion,
} from "@/lib/db/solicitudes";
import {
  conflicto,
  errorInterno,
  errorValidacion,
  falloExterno,
  noAutenticado,
  noEncontrado,
  sinPermiso,
} from "@/lib/http";
import {
  puedeTransicionar,
  transicionesPosibles,
} from "@/lib/reglas-solicitud";
import {
  crearEvaluacionSchema,
  nivelUrgenciaSchema,
} from "@/lib/schemas/evaluacion-triaje";
import { sugerirNivelUrgencia } from "@/lib/servicios/openai";
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
 * Nivel de urgencia (clase 7, H2, spec §8):
 *  - Si el body NO trae `nivelUrgenciaSugerido`, se lo pide a OpenAI. Para esta
 *    operación el servicio es ESENCIAL: sin nivel no hay evaluación que guardar.
 *    Por eso se llama ANTES de guardar, y si falla se responde 502 sin tocar la
 *    base; el médico reenvía con el nivel elegido a mano.
 *  - Si el body lo trae, es el ingreso manual de H2 y no se llama a la IA.
 *
 * La auditoría de la corrección manual (spec §6) sigue esperando una migración:
 * ver docs/adr/0002. La regla de dominio no cambia: la IA sugiere, nunca decide —
 * la derivación la confirma un médico en /aprobacion.
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

    // SERVICIO EXTERNO (esencial) → 502. Va después de las reglas: no se gasta
    // una llamada a OpenAI para una solicitud que igual se iba a rechazar.
    const { nivelUrgenciaSugerido: nivelManual, ...signos } = datos.data;
    const nivel = nivelManual ?? (await sugerirNivelUrgencia(signos, id));
    if (!nivel) {
      return falloExterno(
        "No pudimos obtener la sugerencia de urgencia: el servicio de IA no respondió. Elegí el nivel manualmente y volvé a enviar la evaluación.",
        {
          ingresoManualRequerido: true,
          nivelesPosibles: nivelUrgenciaSchema.options,
        },
      );
    }

    const evaluacion = await registrarEvaluacion(id, {
      ...signos,
      nivelUrgenciaSugerido: nivel,
    });
    return NextResponse.json(
      { ...evaluacion, origenNivel: nivelManual ? "MANUAL" : "IA" },
      { status: 201 },
    );
  } catch (error) {
    return errorInterno("POST /api/solicitudes/:id/evaluacion", error);
  }
}
