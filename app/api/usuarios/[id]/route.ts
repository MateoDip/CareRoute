import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { asignarUsuario } from "@/lib/casos/asignar-usuario";
import { responderError } from "@/lib/errores";
import { errorValidacion, responderRechazo } from "@/lib/http";
import { actualizarUsuarioSchema } from "@/lib/schemas/usuario";

type Contexto = { params: Promise<{ id: string }> };

/**
 * PATCH /api/usuarios/:id — el ADMIN asigna rol y centro (spec §2, ADR 0005).
 *
 * Es la única forma de llegar a MEDICO_RECEPTOR o ADMIN: el registro con Google
 * siempre crea MEDICO_DERIVANTE sin centro. Nadie se asigna un rol a sí mismo.
 * Las reglas viven en lib/casos/asignar-usuario.ts, que también usa la pantalla
 * /admin/usuarios/:id.
 */
export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const admin = await requerirUsuario("ADMIN");
    const { id } = await params;

    const body: unknown = await request.json().catch(() => null);
    const datos = actualizarUsuarioSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    // Usuario inexistente (404), auto-degradación (409) y centro inexistente (404).
    const resultado = await asignarUsuario(admin, id, datos.data);
    if (!resultado.ok) return responderRechazo(resultado);

    return NextResponse.json(resultado.valor, { status: 200 });
  } catch (error) {
    return responderError("PATCH /api/usuarios/:id", error);
  }
}
