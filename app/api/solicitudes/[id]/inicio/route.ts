import { NextResponse } from "next/server";
import { requerirUsuarioConCentro } from "@/lib/auth";
import { iniciarTraslado } from "@/lib/casos/iniciar-traslado";
import { responderError } from "@/lib/errores";
import { responderRechazo } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/solicitudes/:id/inicio — el paciente sale del origen (HU07).
 *
 * El derivante del centro de origen marca que el paciente salió: la solicitud
 * pasa de APROBADA a EN_CURSO y queda el evento en la bitácora (ADR 0011).
 *
 * POST a un sub-recurso y no PATCH, igual que /aprobacion: un PATCH genérico
 * dejaría escribir `estado: "EN_CURSO"` salteando las reglas. Sin body. Las
 * reglas viven en lib/casos/iniciar-traslado.ts, que también usa la ficha.
 */
export async function POST(_request: Request, { params }: Contexto) {
  try {
    // SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuarioConCentro("MEDICO_DERIVANTE");
    const { id } = await params;

    // PERTENENCIA (404) y ESTADO (409), en el caso de uso.
    const resultado = await iniciarTraslado(usuario, id);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
  } catch (error) {
    return responderError("POST /api/solicitudes/:id/inicio", error);
  }
}
