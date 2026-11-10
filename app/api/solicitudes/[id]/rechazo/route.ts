import { NextResponse } from "next/server";
import { ROLES_CLINICOS, requerirUsuarioConCentro } from "@/lib/auth";
import { rechazarDerivacion } from "@/lib/casos/rechazar-derivacion";
import { responderError } from "@/lib/errores";
import { responderRechazo } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/rechazo — cancela una derivación (spec §6).
 *
 * Una APROBADA ya no puede cancelarla el centro emisor (403): el receptor
 * reservó la cama. Antes, cualquiera de los dos médicos puede, cada uno desde su
 * lado. Sin body: el modelo no guarda motivo de rechazo. Las reglas viven en
 * lib/casos/rechazar-derivacion.ts, que también usa el botón de la ficha.
 */
export async function POST(_request: Request, { params }: Contexto) {
  try {
    // SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro(ROLES_CLINICOS);
    const { id } = await params;

    // PERTENENCIA (404), ESTADO (409) y REGLA DE ROL (403), en el caso de uso.
    const resultado = await rechazarDerivacion(usuario, id);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/rechazo", error);
  }
}
