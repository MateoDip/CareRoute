import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import {
  obtenerSolicitudDelCentro,
  registrarEvaluacion,
} from "@/lib/db/solicitudes";
import { responderError } from "@/lib/errores";
import {
  conflicto,
  errorValidacion,
  falloExterno,
  noEncontrado,
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

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/evaluacion — registra el triaje (HU02).
 *
 * Nivel de urgencia (clase 7, spec §8):
 *  - Si el body NO trae `nivelUrgenciaSugerido`, se lo pide a OpenAI. Para esta
 *    operación el servicio es ESENCIAL: sin nivel no hay evaluación que guardar.
 *    Se llama ANTES de guardar; si falla, 502 sin tocar la base, y el médico
 *    reenvía con el nivel elegido a mano (caso de error de HU02).
 *  - Si el body lo trae, es el ingreso manual y no se llama a la IA.
 * Se guarda de dónde salió el nivel (`origenNivel`: IA o MANUAL).
 *
 * La IA sugiere, nunca decide: la derivación la confirma un médico en /aprobacion.
 */
export async function POST(request: Request, { params }: Contexto) {
  try {
    // 1-2. SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_DERIVANTE");
    const { id } = await params;

    // 3. PERTENENCIA → 404. El triaje lo registra el centro de origen.
    const solicitud = await obtenerSolicitudDelCentro(
      id,
      usuario.centroSaludId,
      "origen",
    );
    if (!solicitud) return noEncontrado("La solicitud no existe");

    // 4. BODY → 400
    const body: unknown = await request.json().catch(() => null);
    const datos = crearEvaluacionSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    // 5. REGLAS → 409. EvaluacionTriaje es 1 a 1 con la solicitud.
    if (solicitud.evaluacionTriaje) {
      return conflicto("La solicitud ya fue evaluada", {
        estadoActual: solicitud.estado,
      });
    }
    if (!puedeTransicionar(solicitud.estado, "EVALUANDO")) {
      return conflicto("La solicitud no puede evaluarse en este estado", {
        estadoActual: solicitud.estado,
        transicionesPosibles: transicionesPosibles(solicitud.estado),
      });
    }

    // 6. SERVICIO EXTERNO (esencial) → 502. Después de las reglas: no se gasta
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

    // 7. DELEGAR — null: otro médico la evaluó entre la lectura y la escritura.
    const evaluacion = await registrarEvaluacion(id, {
      ...signos,
      nivelUrgenciaSugerido: nivel,
      origenNivel: nivelManual ? "MANUAL" : "IA",
    });
    if (!evaluacion) {
      return conflicto("La solicitud ya fue evaluada", {
        estadoActual: "EVALUANDO",
      });
    }

    return NextResponse.json(evaluacion, { status: 201 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/evaluacion", error);
  }
}
