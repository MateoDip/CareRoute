"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirAdminEnPagina } from "@/lib/auth";
import { asignarUsuario } from "@/lib/casos/asignar-usuario";
import {
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  opcionDe,
  type EstadoFormulario,
} from "@/lib/formularios";
import { actualizarUsuarioSchema } from "@/lib/schemas/usuario";

/**
 * Asignar rol y centro desde la pantalla. Mismo camino que PATCH /api/usuarios/:id:
 * sesión de ADMIN en la primera línea, el schema de Zod existente y el caso de
 * uso. El id del usuario llega por .bind desde la URL, nunca en el formulario.
 *
 * "Sin centro" en el selector es null: le quita el centro.
 */
export async function asignarUsuarioAction(
  usuarioId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await requerirAdminEnPagina();

  const centro = formData.get("centroSaludId");
  const datos = actualizarUsuarioSchema.safeParse(
    {
      rol: opcionDe(formData, "rol"),
      centroSaludId: centro === "" ? null : centro,
    },
    { errorMap: mensajesEnCastellano },
  );
  if (!datos.success) return estadoDeValidacion(datos.error, formData);

  const resultado = await asignarUsuario(admin, usuarioId, datos.data);
  if (!resultado.ok) return estadoDeRechazo(resultado, formData);

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}
