import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { existeCentro } from "@/lib/db/centros";
import { actualizarUsuario, obtenerUsuario } from "@/lib/db/usuarios";
import { responderError } from "@/lib/errores";
import { conflicto, errorValidacion, noEncontrado } from "@/lib/http";
import { impedimentoParaCambiarUsuario } from "@/lib/reglas-admin";
import { actualizarUsuarioSchema } from "@/lib/schemas/usuario";

type Contexto = { params: Promise<{ id: string }> };

/**
 * PATCH /api/usuarios/:id — el ADMIN asigna rol y centro (spec §2, ADR 0005).
 *
 * Es la única forma de llegar a MEDICO_RECEPTOR o ADMIN: el registro con Google
 * siempre crea MEDICO_DERIVANTE sin centro. Nadie se asigna un rol a sí mismo.
 */
export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const admin = await requerirUsuario("ADMIN");
    const { id } = await params;

    const usuario = await obtenerUsuario(id);
    if (!usuario) return noEncontrado("El usuario no existe");

    const body: unknown = await request.json().catch(() => null);
    const datos = actualizarUsuarioSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    if (
      impedimentoParaCambiarUsuario({
        adminId: admin.id,
        usuarioId: id,
        rolNuevo: datos.data.rol,
      }) === "AUTO_DEGRADACION"
    ) {
      return conflicto(
        "No podés quitarte el rol de administrador a vos mismo. Pedíselo a otro admin.",
      );
    }

    const { centroSaludId } = datos.data;
    if (centroSaludId && !(await existeCentro(centroSaludId))) {
      return noEncontrado("El centro de salud no existe");
    }

    const actualizado = await actualizarUsuario(id, datos.data);
    return NextResponse.json(actualizado, { status: 200 });
  } catch (error) {
    return responderError("PATCH /api/usuarios/:id", error);
  }
}
