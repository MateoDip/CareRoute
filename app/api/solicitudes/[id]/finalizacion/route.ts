import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { finalizarTraslado } from "@/lib/casos/finalizar-traslado";
import { responderError } from "@/lib/errores";
import { responderRechazo } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/finalizacion — el paciente llega al destino (HU07).
 *
 * El receptor del centro de destino marca que el paciente llegó: la solicitud
 * pasa de EN_CURSO a FINALIZADA, queda el evento en la bitácora y la
 * derivación se cierra (regla 6, ADR 0011).
 *
 * Sin body. Las reglas viven en lib/casos/finalizar-traslado.ts, que también
 * usa la ficha.
 */
export async function POST(_request: Request, { params }: Contexto) {
  try {
    // SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_RECEPTOR");
    const { id } = await params;

    // PERTENENCIA (404) y ESTADO (409), en el caso de uso.
    const resultado = await finalizarTraslado(usuario, id);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/finalizacion", error);
  }
}
