import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { aprobarDerivacion } from "@/lib/casos/aprobar-derivacion";
import { responderError } from "@/lib/errores";
import { responderRechazo } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/aprobacion — OPERACIÓN DEL FLUJO PRINCIPAL (HU04)
 *
 * El receptor del centro que eligió el derivante confirma: se reserva la cama,
 * la solicitud pasa a APROBADA y queda la fecha y hora de la decisión.
 *
 * POST a un sub-recurso y no PATCH: un PATCH genérico dejaría escribir
 * `estado: "APROBADA"` salteando las reglas. Sin body: el destino ya está en la
 * solicitud y el centro del receptor sale de su sesión. Las reglas viven en
 * lib/casos/aprobar-derivacion.ts, que también usa el botón de la ficha.
 */
export async function POST(_request: Request, { params }: Contexto) {
  try {
    // SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_RECEPTOR");
    const { id } = await params;

    // PERTENENCIA (404), REGLAS y CAPACIDAD (409), en el caso de uso.
    const resultado = await aprobarDerivacion(usuario, id);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 201 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/aprobacion", error);
  }
}
