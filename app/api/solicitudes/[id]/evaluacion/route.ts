import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { registrarTriaje } from "@/lib/casos/registrar-triaje";
import { responderError } from "@/lib/errores";
import { errorValidacion, responderRechazo } from "@/lib/http";
import { crearEvaluacionSchema } from "@/lib/schemas/evaluacion-triaje";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/evaluacion — registra el triaje (HU02).
 *
 * Si el body NO trae `nivelUrgenciaSugerido`, se lo pide a OpenAI (servicio
 * ESENCIAL: si falla, 502 sin tocar la base y el médico reenvía con el nivel
 * elegido a mano). Si lo trae, es el ingreso manual y no se llama a la IA.
 *
 * Las reglas viven en lib/casos/registrar-triaje.ts, que también usa la pantalla
 * /solicitudes/:id/triaje (clase 12). Acá solo hay HTTP: sesión, body y status.
 */
export async function POST(request: Request, { params }: Contexto) {
  try {
    // SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_DERIVANTE");
    const { id } = await params;

    // BODY → 400
    const body: unknown = await request.json().catch(() => null);
    const datos = crearEvaluacionSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    // PERTENENCIA (404), REGLAS (409) e IA (502), en el caso de uso.
    const resultado = await registrarTriaje(usuario, id, datos.data);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 201 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/evaluacion", error);
  }
}
