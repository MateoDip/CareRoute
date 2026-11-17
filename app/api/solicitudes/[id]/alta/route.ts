import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { darDeAltaAlPaciente } from "@/lib/casos/dar-de-alta";
import { responderError } from "@/lib/errores";
import { responderRechazo } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/alta — el paciente recibe el alta (regla 7).
 *
 * El receptor del centro de destino da de alta al paciente internado: su cama
 * vuelve a quedar libre y queda "Alta del paciente" en la bitácora. Solo con la
 * derivación FINALIZADA y una sola vez.
 *
 * Sin body. Las reglas viven en lib/casos/dar-de-alta.ts, que también usa la ficha.
 */
export async function POST(_request: Request, { params }: Contexto) {
  try {
    // SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_RECEPTOR");
    const { id } = await params;

    // PERTENENCIA (404) y ESTADO (409), en el caso de uso.
    const resultado = await darDeAltaAlPaciente(usuario, id);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/alta", error);
  }
}
