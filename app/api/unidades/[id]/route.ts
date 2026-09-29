import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { actualizarUnidad, obtenerUnidadEditable } from "@/lib/db/centros";
import { responderError } from "@/lib/errores";
import { errorValidacion, noEncontrado } from "@/lib/http";
import { actualizarUnidadSchema } from "@/lib/schemas/unidad-cuidados";

type Contexto = { params: Promise<{ id: string }> };

/**
 * PATCH /api/unidades/:id — actualiza las camas disponibles (HU05).
 *
 * PATCH y no PUT: solo se toca lo que se envía; con PUT dos personas editando a
 * la vez se pisarían. Un solo nivel de anidamiento: la unidad tiene id propio.
 */
export async function PATCH(request: Request, { params }: Contexto) {
  try {
    // 1-2. SESIÓN y ROL → 401 / 403
    const usuario = await requerirUsuario(["ADMIN", "MEDICO_RECEPTOR"]);
    const { id } = await params;

    // 3. PERTENENCIA → 404, en el where: el receptor solo ve las de su centro.
    const unidad = await obtenerUnidadEditable(id, usuario);
    if (!unidad) return noEncontrado("La unidad no existe");

    // 4. BODY → 400 (camas negativas: caso de error de HU05)
    const body: unknown = await request.json().catch(() => null);
    const datos = actualizarUnidadSchema.safeParse(body);
    if (!datos.success) return errorValidacion(datos.error);

    const actualizada = await actualizarUnidad(id, datos.data);
    return NextResponse.json(actualizada, { status: 200 });
  } catch (error) {
    return responderError("PATCH /api/unidades/:id", error);
  }
}
