import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { elegirDestino } from "@/lib/casos/elegir-destino";
import { responderError } from "@/lib/errores";
import { errorValidacion, responderRechazo } from "@/lib/http";
import { asignarDestinoSchema } from "@/lib/schemas/solicitud-traslado";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/destino — el médico derivante elige, del ranking, el
 * centro al que quiere derivar (HU04, paso 4 del flujo principal).
 *
 * Todavía no reserva cama: la reserva la hace la aprobación del receptor. Las
 * reglas viven en lib/casos/elegir-destino.ts, que también usa la pantalla.
 */
export async function POST(request: Request, { params }: Contexto) {
  try {
    // SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_DERIVANTE");
    const { id } = await params;

    // BODY → 400
    const body: unknown = await request.json().catch(() => null);
    const datos = asignarDestinoSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    // PERTENENCIA (404), REGLAS y CAPACIDAD (409), en el caso de uso.
    const resultado = await elegirDestino(usuario, id, datos.data.centroDestinoId);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/destino", error);
  }
}
