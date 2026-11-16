import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { pasarAOtraUnidad } from "@/lib/casos/cambiar-de-unidad";
import { responderError } from "@/lib/errores";
import { errorValidacion, responderRechazo } from "@/lib/http";
import { cambioDeUnidadSchema } from "@/lib/schemas/unidad-cuidados";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/cambio-de-unidad — el paciente internado pasa a
 * otra unidad del centro (regla 7), por ejemplo de UTI a sala común.
 *
 * Body: `{ "tipo": "SALA_COMUN" }`. Libera la cama que ocupaba y toma una del
 * tipo nuevo, todo o nada; sin cama de ese tipo, 409 "Capacidad agotada" con los
 * tipos que sí tienen. Las reglas viven en lib/casos/cambiar-de-unidad.ts.
 */
export async function POST(request: Request, { params }: Contexto) {
  try {
    // SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_RECEPTOR");
    const { id } = await params;

    // BODY → 400
    const body: unknown = await request.json().catch(() => null);
    const datos = cambioDeUnidadSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    // PERTENENCIA (404), ESTADO y MISMA UNIDAD (409) y CAPACIDAD (409), en el caso de uso.
    const resultado = await pasarAOtraUnidad(usuario, id, datos.data.tipo);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/cambio-de-unidad", error);
  }
}
