import { NextResponse } from "next/server";
import { ROLES_CLINICOS, requerirUsuarioConCentro } from "@/lib/auth";
import { rankingDeDestinos } from "@/lib/casos/ranking-destinos";
import { responderError } from "@/lib/errores";
import { responderRechazo } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

/**
 * GET /api/solicitudes/:id/candidatos — ranking de hospitales (HU03).
 *
 * Anidado bajo la solicitud porque los criterios del scoring salen de ella: el
 * tipo de cama depende de su triaje y el centro de origen se excluye. Si el
 * cliente los mandara, podría mentir (urgencia BAJO para un paciente crítico).
 * La misma función arma el ranking de la pantalla /solicitudes/:id/destino.
 */
export async function GET(_request: Request, { params }: Contexto) {
  try {
    const usuario = await requerirUsuarioConCentro(ROLES_CLINICOS);
    const { id } = await params;

    const resultado = await rankingDeDestinos(usuario, id);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
  } catch (error) {
    return responderError("GET /api/solicitudes/:id/candidatos", error);
  }
}
